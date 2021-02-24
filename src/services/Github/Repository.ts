import {
  ReposCompareCommitsResponseData,
  ReposGetResponseData,
} from '@octokit/types'

import { readClient } from '@sr-services/Github/Client'
import { Repository, Sha } from '@sr-services/Github/Git'
import { organizationName } from '@sr-services/Inputs'

/**
 * Returns details about the diff between the two commits¥.
 *
 * @param {Repository} repo The name of the repository to fetch.
 * @param {Sha}        base The base commit to merge INTO (eg. master, when making a release).
 * @param {Sha}        head The head commit to merge FROM (eg. develop, when making a release).
 * @returns {ReposCompareCommitsResponseData} The diff data.
 */
export const compareCommits = async (
  repo: Repository,
  base: Sha,
  head: Sha
): Promise<ReposCompareCommitsResponseData> => {
  const response = await readClient().repos.compareCommits({
    owner: organizationName(),
    repo,
    base,
    head,
  })

  return (response.data as unknown) as ReposCompareCommitsResponseData
}

/**
 * Decides what number the next pull request will be.
 *
 * @param {Repository} repo The name of the repository that the PR will belong to.
 * @returns {number}   The number of the next PR.
 */
export const getNextPullRequestNumber = async (
  repo: Repository
): Promise<number> => {
  const response = await readClient().pulls.list({
    direction: 'desc',
    owner: organizationName(),
    page: 1,
    per_page: 1,
    repo,
    sort: 'created',
    state: 'all',
  })

  if (response.data.length === 0) {
    return 1
  }

  return response.data[0].number + 1
}

/**
 * Returns the repository with the given name.
 *
 * @param {Repository} repo The name of the repository to fetch.
 * @returns {ReposGetResponseData} The repository data.
 */
export const getRepository = async (
  repo: Repository
): Promise<ReposGetResponseData> => {
  const response = await readClient().repos.get({
    owner: organizationName(),
    repo,
  })
  return (response.data as unknown) as ReposGetResponseData
}

/**
 * Returns the URL of the repository with the given name.
 *
 * @param {Repository} repo The name of the repository.
 * @returns {string} The URL of the repository.
 */
export const repositoryUrl = (repo: Repository): string =>
  `https://github.com/${organizationName()}/${repo}`
