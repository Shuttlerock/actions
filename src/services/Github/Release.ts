import { error, info } from '@actions/core'
import {
  PullsGetResponseData,
  ReposCreateReleaseResponseData,
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'

import {
  DevelopBranchName,
  InProgressLabel,
  ReleaseBranchName,
  ReleaseLabel,
} from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import {
  deleteBranch,
  getBranch,
  getMasterBranch,
} from '@sr-services/Github/Branch'
import { client, readClient } from '@sr-services/Github/Client'
import {
  createGitBranch,
  Commit,
  Repository,
  Sha,
} from '@sr-services/Github/Git'
import { setLabels } from '@sr-services/Github/Label'
import {
  assignOwners,
  createPullRequest,
  extractPullRequestNumber,
  getIssueKey,
  getPullRequest,
  pullRequestUrl,
  updatePullRequest,
} from '@sr-services/Github/PullRequest'
import { compareCommits, repositoryUrl } from '@sr-services/Github/Repository'
import { githubWriteToken, organizationName } from '@sr-services/Inputs'
import { issueUrl } from '@sr-services/Jira'
import { reportError, reportInfo, sendUserMessage } from '@sr-services/Slack'
import { generateReleaseName } from '@sr-services/String'

/**
 * Creates release notes from the list of commits in the release.
 *
 * @param {Repository} repoName    The name of the repository that the release belongs to.
 * @param {string}     releaseDate The formatted date and time of the release.
 * @param {string}     releaseName The name of the release.
 * @param {Commit[]}   commits     The list of commits that make up the release.
 * @returns {string} The pull request description.
 */
const getReleaseNotes = async (
  repoName: string,
  releaseDate: string,
  releaseName: string,
  commits: Commit[]
): Promise<string> => {
  info(`Making release notes from ${commits.length} commits...`)
  const dependencies = commits.filter(
    (commit: Commit) =>
      commit.author?.login?.startsWith('dependabot') &&
      commit.commit.message.includes('Bump ')
  )

  const prNumbers = [
    ...new Set(
      commits
        .map((commit: Commit) =>
          extractPullRequestNumber(commit.commit.message)
        )
        .filter((prNumber: number | undefined) => prNumber)
    ),
  ]

  const pulls = (
    await Promise.all(
      (prNumbers as number[]).map(async (prNumber: number) => {
        try {
          return getPullRequest(repoName, prNumber)
        } catch (err) {
          error(
            `Couldn't find the pull request ${repoName}#${prNumber} for release notes. Here's the commit list:`
          )
          commits.map((commit: Commit) => error(`  ${commit.commit.message}`))
          return undefined
        }
      })
    )
  ).filter(
    (pull: PullsGetResponseData | undefined) =>
      pull && !/Bump .+ from .+ to .*$/.exec(pull.title)
  ) as PullsGetResponseData[]

  let description = `## Release Candidate ${releaseDate} (${releaseName})\n\n`

  // Github only gives us 250 commits. This is usually enough, but add a note if we hit the limit.
  if (commits.length === 250) {
    description +=
      ':warning: This release contains more than 250 commits, so the release notes may not be complete :warning:\n\n'
  }

  if (pulls.length > 0) {
    description += '### Pull Requests\n\n'
    pulls.forEach((pull: PullsGetResponseData) => {
      const title = pull.title.replace(/(\[[^\]]+\])/g, '').trim()
      const jiraKey = getIssueKey(pull)
      description += `- #${pull.number} ${title}`
      if (!isNil(jiraKey)) {
        description += ` ([${jiraKey}](${issueUrl(jiraKey)}))`
      }
      description += '\n'
    })
    description += '\n'
  }

  if (dependencies.length > 0) {
    description += '### Dependency updates\n\n'
    dependencies.forEach((commit: Commit) => {
      // Linkify the last word to point to the commit (the new version, for bumps).
      const message = commit.commit.message
        .split('\n')[0]
        .replace(
          / (\S*$)/,
          ` [$1](https://github.com/${organizationName()}/${repoName}/commit/${
            commit.sha
          })`
        )
      description += `- ${message}\n`
    })
  }

  return description
}

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {Repository} repoName The name of the repository that the branch will belong to.
 * @param {string}     sha      The commit sha to branch from.
 * @returns {ReposGetBranchResponseData} The branch data.
 */
const ensureReleasebranch = async (
  repoName: Repository,
  sha: Sha
): Promise<ReposGetBranchResponseData> => {
  info(`Looking for an existing release branch (${ReleaseBranchName})...`)
  const releaseBranch = await getBranch(repoName, ReleaseBranchName)
  if (isNil(releaseBranch)) {
    info('Existing release branch not found - creating it...')
    await createGitBranch(repoName, ReleaseBranchName, sha)
    // This is inefficient, but we look up the branch we just created to keep types consistent.
    return ensureReleasebranch(repoName, sha)
  }

  if (releaseBranch.commit.sha === sha) {
    info(`The release branch already exists, and is up to date (${sha})`)
    return releaseBranch
  }

  info(
    'The release branch already exists, but is out of date - re-creating it...'
  )
  await deleteBranch(repoName, ReleaseBranchName)
  return ensureReleasebranch(repoName, sha)
}

/**
 * Looks for an existing open pull request for a release.
 *
 * @param {Repository} repoName     The name of the repository that the PR will belong to.
 * @param {string}     masterBranch The name of the branch to merge releases into.
 * @param {string}     releaseDate  The name of the release (basically a formatted datetime).
 * @param {string}     releaseName  The name of the release.
 * @param {string}     body         The pull request release notes.
 * @returns {PullsGetResponseData | void} The pull request, if it exists.
 */
const getReleasePullRequest = async (
  repoName: Repository,
  masterBranch: string,
  releaseDate: string,
  releaseName: string,
  body: string
): Promise<PullsGetResponseData | undefined> => {
  info('Searching for an existing release pull request...')
  const response = await readClient().pulls.list({
    base: masterBranch,
    direction: 'desc',
    head: `${organizationName()}:${ReleaseBranchName}`,
    owner: organizationName(),
    page: 1,
    per_page: 1,
    repo: repoName,
    sort: 'created',
    state: 'open',
  })

  const title = `Release Candidate ${releaseDate} (${releaseName})`

  if (response.data.length === 0) {
    info('No existing release pull request was found - creating it...')
    return createPullRequest(
      repoName,
      masterBranch,
      ReleaseBranchName,
      title,
      body,
      githubWriteToken()
    )
  }

  const prNumber = response.data[0].number
  info(
    `An existing release pull request was found (${repoName}#${prNumber}) - updating the release notes...`
  )
  return updatePullRequest(repoName, prNumber, { body, title })
}

/**
 * Creates a release pull request for the given repository.
 *
 * @param {string} email         The email address of the user who requested the release be created.
 * @param {ReposGetResponseData} repo The Github repository that we will create the release / pull request for.
 * @returns {void}
 */
export const createReleasePullRequest = async (
  email: string,
  repo: ReposGetResponseData
): Promise<void> => {
  info(`Creating a release pull request for repository ${repo.name}`)
  info(`Fetching credentials for user '${email}'...`)
  const credentials = await fetchCredentials(email)

  info(`Sending a message to Slack user '${credentials.slack_id}'...`)
  await sendUserMessage(
    credentials.slack_id,
    `Creating a release for *<${repositoryUrl(
      repo.name
    )}|${organizationName()}/${repo.name}>*...`
  )

  info(`Looking for a '${DevelopBranchName}' branch...`)
  const develop = await getBranch(repo.name, DevelopBranchName)
  if (isNil(develop)) {
    const message = `Branch '${DevelopBranchName}' could not be found for repository ${repo.name} - giving up`
    return reportError(credentials.slack_id, message)
  }

  const master = await getMasterBranch(repo.name)
  if (isNil(master)) {
    const message = `Master branch could not be found for repository ${repo.name} - giving up`
    return reportError(credentials.slack_id, message)
  }

  info(
    `Checking if '${DevelopBranchName}' is ahead of '${master.name}' (${master.commit.sha}..${develop.commit.sha})`
  )
  const diff = await compareCommits(
    repo.name,
    master.commit.sha,
    develop.commit.sha
  )
  if (diff.total_commits === 0) {
    const message = `Branch '${master.name}' already contains the latest release - nothing to do`
    return reportInfo(credentials.slack_id, message)
  }
  info(`Found ${diff.total_commits} commits to release`)

  await ensureReleasebranch(repo.name, develop.commit.sha)
  const releaseDate = new Date()
    .toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '')
    .replace(/[ ]/g, '-')
    .replace(/:\d{2}$/, '')
    .replace(':', '')
  const releaseName = generateReleaseName()
  const description = await getReleaseNotes(
    repo.name,
    releaseDate,
    releaseName,
    diff.commits
  )
  const pullRequest = await getReleasePullRequest(
    repo.name,
    master.name,
    releaseDate,
    releaseName,
    description
  )
  if (isNil(pullRequest)) {
    const message = `An unknown error occurred while creating a release pull request for repository '${repo.name}'`
    return reportError(credentials.slack_id, message)
  }

  // Assign someone, if no-one has been assigned yet.
  if (isEmpty(pullRequest.assignees)) {
    if (isNil(credentials.github_username)) {
      info(
        `Credentials for ${email} don't have a Github account linked, so we can't assign an owner`
      )
    } else {
      info(`Assigning @${credentials.github_username} as the owner...`)
      await assignOwners(repo.name, pullRequest.number, [
        credentials.github_username,
      ])
    }
  }

  // Add labels, if the PR has not been labeled yet.
  if (isEmpty(pullRequest.labels)) {
    info(`Adding labels '${InProgressLabel}' and '${ReleaseLabel}'...`)
    await setLabels(repo.name, pullRequest.number, [
      InProgressLabel,
      ReleaseLabel,
    ])
  }

  return reportInfo(
    credentials.slack_id,
    `Here's your release PR: *<${pullRequestUrl(
      repo.name,
      pullRequest.number
    )}|${repo.name}#${pullRequest.number}>*`
  )
}

/**
 * Creates a release tag for the given repository.
 *
 * @param {Repository} repo         The name of the repository we will create the release tag for.
 * @param {string}     tagName      The string to tag the release with (eg. v2021-01-12-0426).
 * @param {string}     releaseName  The name of the release (eg. Energetic Eagle).
 * @param {string}     releaseNotes The notes to include as the body of the release.
 * @returns {ReposCreateReleaseResponseData} The resulting release.
 */
export const createReleaseTag = async (
  repo: Repository,
  tagName: string,
  releaseName: string,
  releaseNotes: string
): Promise<ReposCreateReleaseResponseData | undefined> => {
  const name = `${tagName} (${releaseName})`
  const master = await getMasterBranch(repo)
  if (isNil(master)) {
    error(
      `Master branch could not be found for repository ${repo} - giving up release tagging`
    )
    return undefined
  }

  const response = await client().repos.createRelease({
    body: releaseNotes,
    draft: false,
    name,
    owner: organizationName(),
    repo,
    tag_name: tagName,
    target_commitish: master.name,
  })

  return response.data
}
