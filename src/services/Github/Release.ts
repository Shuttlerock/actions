import { error, info } from '@actions/core'
import {
  PullsGetResponseData,
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import dateFormat from 'dateformat'
import isNil from 'lodash/isNil'

import {
  DevelopBranchName,
  MasterBranchName,
  ReleaseBranchName,
} from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import { deleteBranch, getBranch } from '@sr-services/Github/Branch'
import { readClient } from '@sr-services/Github/Client'
import {
  createGitBranch,
  Commit,
  Repository,
  Sha,
} from '@sr-services/Github/Git'
import {
  createPullRequest,
  getPullRequest,
  pullRequestUrl,
  updatePullRequest,
} from '@sr-services/Github/PullRequest'
import { compareCommits, repositoryUrl } from '@sr-services/Github/Repository'
import { githubWriteToken, organizationName } from '@sr-services/Inputs'
import { sendUserMessage } from '@sr-services/Slack'
import { generateReleaseName } from '@sr-services/String'

/**
 * Creates release notes from the list of commits in the release.
 *
 * @param {Repository} repoName    The name of the repository that the release belongs to.
 * @param {string}     releaseDate The formatted date and time of the release.
 * @param {string}     releaseName The name of the release.
 * @param {Commit[]}   commits     The list of commits that make up the release.
 *
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
      commit.author.login.startsWith('dependabot') &&
      commit.commit.message.startsWith('Bump ')
  )

  const prNumbers = [
    ...new Set(
      commits
        .map((commit: Commit) =>
          parseInt(commit.commit.message.replace(/^.*\[#(\d+)\].*$/, '$1'), 10)
        )
        .filter((prNumber: number) => prNumber)
    ),
  ]

  const pulls = (
    await Promise.all(
      prNumbers.map(async (prNumber: number) =>
        getPullRequest(repoName, prNumber)
      )
    )
  ).filter(
    (pull: PullsGetResponseData | undefined) =>
      pull && !/^Bump .+ from .+ to .*$/.exec(pull.title)
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
      description += `- #${pull.number} ${title}\n`
    })
    description += '\n'
  }

  if (dependencies.length > 0) {
    description += '### Dependency updates\n\n'
    dependencies.forEach((commit: Commit) => {
      description += `- ${commit.sha.substring(0, 7)} ${
        commit.commit.message.split('\n')[0]
      }\n`
    })
  }

  return description
}

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {Repository} repoName The name of the repository that the branch will belong to.
 * @param {string}     sha      The commit sha to branch from.
 *
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
 * @param {Repository} repoName    The name of the repository that the PR will belong to.
 * @param {string}     releaseDate The name of the release (basically a formatted datetime).
 * @param {string}     releaseName The name of the release.
 * @param {string}     body        The pull request release notes.
 *
 * @returns {PullsGetResponseData | void} The pull request, if it exists.
 */
const getReleasePullRequest = async (
  repoName: Repository,
  releaseDate: string,
  releaseName: string,
  body: string
): Promise<PullsGetResponseData | undefined> => {
  info('Searching for an existing release pull request...')
  const response = await readClient.pulls.list({
    base: MasterBranchName,
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
      MasterBranchName,
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
 * Sends an error to the given Slack account, and logs it to Github actions.
 *
 * @param {string} slackId The Slack user ID of the person to send the error message to.
 * @param {string} message The message to send.
 *
 * @returns {void}
 */
const reportError = async (slackId: string, message: string) => {
  await sendUserMessage(slackId, message)
  error(message)
  return undefined
}

/**
 * Sends an informational message to the given Slack account, and logs it to Github actions.
 *
 * @param {string} slackId The Slack user ID of the person to send the message to.
 * @param {string} message The message to send.
 *
 * @returns {void}
 */
const reportInfo = async (slackId: string, message: string) => {
  await sendUserMessage(slackId, message)
  info(message)
  return undefined
}

/**
 * Creates a release pull request for the given repository.
 *
 * @param {string} email         The email address of the user who requested the release be created.
 * @param {ReposGetResponseData} repo The Github repository that we will create the release / pull request for.
 *
 * @returns {void}
 */
export const createReleasePullRequest = async (
  email: string,
  repo: ReposGetResponseData
): Promise<void> => {
  info(`Creating a release pull request for repository ${repo.name}`)
  info(`Fetching credentials for user '${email}'...`)
  const credentials = await fetchCredentials(email)

  await sendUserMessage(
    credentials.slack_id,
    `Creating a release for <${repositoryUrl(
      repo.name
    )}|${organizationName()}/${repo.name}>...`
  )

  const develop = await getBranch(repo.name, DevelopBranchName)
  if (isNil(develop)) {
    const message = `Branch '${DevelopBranchName}' could not be found for repository ${repo.name} - giving up`
    return reportError(credentials.slack_id, message)
  }

  const master = await getBranch(repo.name, MasterBranchName)
  if (isNil(master)) {
    const message = `Branch '${MasterBranchName}' could not be found for repository ${repo.name} - giving up`
    return reportError(credentials.slack_id, message)
  }

  info(
    `Checking if '${DevelopBranchName}' is ahead of '${MasterBranchName}' (${master.commit.sha}..${develop.commit.sha})`
  )
  const diff = await compareCommits(
    repo.name,
    master.commit.sha,
    develop.commit.sha
  )
  if (diff.total_commits === 0) {
    const message = `Branch '${MasterBranchName}' already contains the latest release - nothing to do`
    return reportInfo(credentials.slack_id, message)
  }
  info(`Found ${diff.total_commits} commits to release`)

  await ensureReleasebranch(repo.name, develop.commit.sha)
  const releaseDate = dateFormat(new Date(), 'yyyy-mm-dd-hhss')
  const releaseName = generateReleaseName()
  const description = await getReleaseNotes(
    repo.name,
    releaseDate,
    releaseName,
    diff.commits
  )
  const pullRequest = await getReleasePullRequest(
    repo.name,
    releaseDate,
    releaseName,
    description
  )
  if (isNil(pullRequest)) {
    const message = `An unknown error occurred while creating a release pull request for repository '${repo.name}'`
    return reportError(credentials.slack_id, message)
  }

  return reportInfo(
    credentials.slack_id,
    `Here's your release PR: ${pullRequestUrl(repo.name, pullRequest.number)}`
  )
}
