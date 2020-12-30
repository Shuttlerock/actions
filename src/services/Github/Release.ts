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
import { createGitBranch, Repository, Sha } from '@sr-services/Github/Git'
import { getPullRequest } from '@sr-services/Github/PullRequest'
import { compareCommits } from '@sr-services/Github/Repository'
import { organizationName } from '@sr-services/Inputs'
import { debug } from '@sr-services/Log'

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {Repository} repoName The name of the repository that the branch will belong to.
 * @param {string}     sha      The commit sha to branch from.
 *
 * @returns {ReposGetBranchResponseData} The branch data.
 */
export const getReleasebranch = async (
  repoName: Repository,
  sha: Sha
): Promise<ReposGetBranchResponseData | undefined> => {
  info(`Looking for an existing release branch (${ReleaseBranchName})...`)
  const releaseBranch = await getBranch(repoName, ReleaseBranchName)
  if (isNil(releaseBranch)) {
    info('Existing release branch not found - creating it...')
    await createGitBranch(repoName, ReleaseBranchName, sha)
    // This is inefficient, but we look up the branch we just created to keep types consistent.
    return getReleasebranch(repoName, sha)
  }

  if (releaseBranch.commit.sha === sha) {
    info(`The release branch already exists, and is up to date (${sha})`)
    return releaseBranch
  }

  info(
    'The release branch already exists, but is out of date - re-creating it...'
  )
  await deleteBranch(repoName, ReleaseBranchName)
  return getReleasebranch(repoName, sha)
}

/**
 * Looks for an existing open pull request for a release.
 *
 * @param {Repository} repoName The name of the repository that the PR will belong to.
 *
 * @returns {PullsGetResponseData | void} The pull request, if it exists.
 */
export const getReleasePullRequest = async (
  repoName: Repository
): Promise<PullsGetResponseData | void> => {
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

  if (response.data.length === 0) {
    return undefined
  }

  // Look up the PR again to keep types consistent.
  return getPullRequest(repoName, response.data[0].number)
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
  const releaseBranch = await getReleasebranch(repo.name, develop.commit.sha)

  debug('-------------------------')
  debug(releaseBranch)
  debug(releaseName)
}
