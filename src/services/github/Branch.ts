import { ReposGetBranchResponseData } from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/github/Client'
import { Branch, Repository } from '@sr-services/github/Git'

/**
 * Fetches a branch from the Github API.
 *
 * @param {Repository} repo   The name of the repository that the branch belongs to.
 * @param {Branch}     branch The name of the branch to fetch.
 *
 * @returns {ReposGetBranchResponseData} The branch data.
 */
export const getBranch = async (
  repo: Repository,
  branch: Branch
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
