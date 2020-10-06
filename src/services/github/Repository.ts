import { ReposGetResponseData } from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/github/Client'

/**
 * Decides what number the next pull request will be.
 *
 * @param {string} repo The name of the repository that the PR will belong to.
 *
 * @returns {number} The number of the next PR.
 */
export const getNextPullRequestNumber = async (
  repo: string
): Promise<number> => {
  const response = await client.pulls.list({
    direction: 'desc',
    owner: OrganizationName,
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
 * @param {string} repo The name of the repository to fetch.
 *
 * @returns {ReposGetResponseData} The repository data.
 */
export const getRepository = async (
  repo: string
): Promise<ReposGetResponseData> => {
  const response = await client.repos.get({
    owner: OrganizationName,
    repo,
  })
  return response.data
}
