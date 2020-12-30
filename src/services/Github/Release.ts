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
} from '@sr-services/Github/PullRequest'
import { compareCommits } from '@sr-services/Github/Repository'
import { githubWriteToken, organizationName } from '@sr-services/Inputs'
import { debug } from '@sr-services/Log'

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {Repository} repoName    The name of the repository that the release belongs to.
 * @param {string}     releaseName The name of the release.
 * @param {Commit[]}   commits     The list of commits that make up the release.
 *
 * @returns {string} The pull request description.
 */
const getPullRequestDescription = async (
  repoName: string,
  releaseName: string,
  commits: Commit[]
): Promise<string> => {
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

  let description = `## Release Candidate ${releaseName}\n\n`
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
 * @param {string}     releaseName The name of the release (basically a formatted datetime).
 *
 * @returns {PullsGetResponseData | void} The pull request, if it exists.
 */
const getReleasePullRequest = async (
  repoName: Repository,
  releaseName: string
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

  let prNumber

  if (response.data.length === 0) {
    info('No existing release pull request was found - creating it...')
    const pullRequest = await createPullRequest(
      repoName,
      MasterBranchName,
      ReleaseBranchName,
      `Release Candidate ${releaseName}`,
      'TODO: pull request body',
      githubWriteToken()
    )
    prNumber = pullRequest.number
  } else {
    prNumber = response.data[0].number
    info(`An existing release pull request was found (${repoName}#${prNumber})`)
  }

  // Look up the PR again to keep types consistent.
  info('Reloading the release pull request...')
  return getPullRequest(repoName, prNumber)
}

/**
 * Creates a release pull request for the given repository.
 *
 * @param {ReposGetResponseData} repo The Github repository that we will create the release / pull request for.
 *
 * @returns {void}
 */
export const createReleasePullRequest = async (
  repo: ReposGetResponseData
): Promise<void> => {
  const develop = await getBranch(repo.name, DevelopBranchName)
  if (isNil(develop)) {
    error(
      `Branch '${DevelopBranchName}' could not be found for repository ${repo.name} - giving up`
    )
    return
  }

  const master = await getBranch(repo.name, MasterBranchName)
  if (isNil(master)) {
    error(
      `Branch '${MasterBranchName}' could not be found for repository ${repo.name} - giving up`
    )
    return
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
    info(
      `Branch '${MasterBranchName}' already contains the latest release - nothing to do`
    )
    return
  }
  info(`Found ${diff.total_commits} commits to release`)

  const releaseName = dateFormat(new Date(), 'yyyy-mm-dd-hhss')
  await ensureReleasebranch(repo.name, develop.commit.sha)
  const pullRequest = await getReleasePullRequest(repo.name, releaseName)

  debug('-------------------------')
  debug(pullRequest)
  debug('-------------------------')

  await getPullRequestDescription(repo.name, releaseName, diff.commits)
}
