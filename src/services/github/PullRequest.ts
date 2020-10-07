import { PullsCreateResponseData } from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/github/Client'
import { Branch } from '@sr-services/github/Git'

/**
 * Creates a new pull request.
 *
 * @param {string} repo  The name of the repository that the PR will belong to.
 * @param {Branch} base  The base branch, which the PR will be merged into.
 * @param {Branch} head  The head branch, which the PR will be based on.
 * @param {string} title The title of the PR.
 * @param {string} body  The body of the PR.
 *
 * @returns {PullsCreateResponseData} The PR data.
 */
export const createPullRequest = async (
  repo: string,
  base: Branch,
  head: Branch,
  title: string,
  body: string
): Promise<PullsCreateResponseData> => {
  const response = await client.pulls.create({
    base,
    body,
    draft: true,
    head,
    owner: OrganizationName,
    repo,
    title,
  })

  return response.data
}
