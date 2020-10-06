import { ReposGetBranchResponseData } from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/github/Client'

/**
 * Fetches a branch from the Github API.
 *
 * @param {string} repo   The name of the repository that the branch belongs to.
 * @param {string} branch The name of the branch to fetch.
 *
 * @returns {ReposGetBranchResponseData} The branch data.
 */
export const getBranch = async (
  repo: string,
  branch: string
): Promise<ReposGetBranchResponseData | undefined> => {
  try {
    const response = await client.repos.getBranch({
      owner: OrganizationName,
      repo,
      branch,
    })
    return response.data
  } catch (err) {
    if (err.message === 'Branch not found') {
      return undefined
    }

    throw err
  }

  return undefined
}
