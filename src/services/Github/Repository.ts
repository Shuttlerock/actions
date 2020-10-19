import { ReposGetResponseData } from '@octokit/types'

import { organizationName } from '@sr-services/Constants'
import { readClient } from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'

/**
 * Decides what number the next pull request will be.
 *
 * @param {Repository} repo The name of the repository that the PR will belong to.
 * @returns {number}   The number of the next PR.
 */
export const getNextPullRequestNumber = async (
  repo: Repository
): Promise<number> => {
  const response = await readClient.pulls.list({
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
 *
 * @returns {ReposGetResponseData} The repository data.
 */
export const getRepository = async (
  repo: Repository
): Promise<ReposGetResponseData> => {
  const response = await readClient.repos.get({
    owner: organizationName(),
    repo,
  })
  return response.data
}
