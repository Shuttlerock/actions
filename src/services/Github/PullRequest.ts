import {
  IssuesAddAssigneesResponseData,
  IssuesAddLabelsResponseData,
  PullsCreateResponseData,
} from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client, clientForToken } from '@sr-services/Github/Client'
import { Branch, Repository } from '@sr-services/Github/Git'

/**
 * Adds labels to the given issue or PR.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The PR number.
 * @param {string[]}   labels The labels to add.
 *
 * @returns {IssuesAddLabelsResponseData} The PR data.
 */
export const addLabels = async (
  repo: Repository,
  number: number,
  labels: string[]
): Promise<IssuesAddLabelsResponseData> => {
  const response = await client.issues.addLabels({
    issue_number: number,
    labels,
    owner: OrganizationName,
    repo,
  })

  return response.data
}

/**
 * Assigns owners to the given issue or PR.
 *
 * @param {Repository} repo      The name of the repository that the PR belongs to.
 * @param {number}     number    The PR number.
 * @param {string[]}   usernames The usernames of the users to assign as owners.
 *
 * @returns {IssuesAddAssigneesResponseData} The PR data.
 */
export const assignOwners = async (
  repo: Repository,
  number: number,
  usernames: string[]
): Promise<IssuesAddAssigneesResponseData> => {
  const response = await client.issues.addAssignees({
    assignees: usernames,
    issue_number: number,
    owner: OrganizationName,
    repo,
  })

  return response.data
}

/**
 * Creates a new pull request.
 *
 * @param {Repository} repo  The name of the repository that the PR will belong to.
 * @param {Branch}     base  The base branch, which the PR will be merged into.
 * @param {Branch}     head  The head branch, which the PR will be based on.
 * @param {string}     title The title of the PR.
 * @param {string}     body  The body of the PR.
 * @param {string}     token The Github API token to use when creating the PR.
 *
 * @returns {PullsCreateResponseData} The PR data.
 */
export const createPullRequest = async (
  repo: Repository,
  base: Branch,
  head: Branch,
  title: string,
  body: string,
  token: string
): Promise<PullsCreateResponseData> => {
  const response = await clientForToken(token).pulls.create({
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
