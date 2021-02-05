import {
  IssuesAddAssigneesResponseData,
  PullsCreateReviewResponseData,
  PullsGetResponseData,
  PullsListCommitsResponseData,
  PullsRequestReviewersResponseData,
} from '@octokit/types'
import isNil from 'lodash/isNil'

import { client, clientForToken, readClient } from '@sr-services/Github/Client'
import { Branch, Repository } from '@sr-services/Github/Git'
import { jiraHost, organizationName } from '@sr-services/Inputs'

export interface PullRequestContent {
  title: string
  body: string
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
    owner: organizationName(),
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
 * @returns {PullsGetResponseData} The PR data.
 */
export const createPullRequest = async (
  repo: Repository,
  base: Branch,
  head: Branch,
  title: string,
  body: string,
  token: string
): Promise<PullsGetResponseData> => {
  const response = await clientForToken(token).pulls.create({
    base,
    body,
    draft: true,
    head,
    owner: organizationName(),
    repo,
    title,
  })

  return response.data as PullsGetResponseData
}

/**
 * Returns the Jira issue key for the pull request with the given number.
 *
 * @param {PullRequestContent} pr The body of the pull request which we will parse.
 *
 * @returns {string | undefined} The Jira issue key.
 */
export const getIssueKey = (pr: PullRequestContent): string | undefined => {
  // Try to get the key from the title.
  let matches = /^\[([A-Z]+-[\d]+)\] .*$/.exec(pr.title)
  if (matches?.length === 2) {
    return matches[1]
  }

  // Try to get the key from a link in the body.
  const regex = new RegExp(
    // eslint-disable-next-line no-useless-escape
    `${jiraHost().replace(/\./g, '\\.')}/browse/([A-Z]+-[\\d]+)\\)`,
    'm'
  )
  matches = regex.exec(pr.body)
  if (matches?.length === 2) {
    return matches[1]
  }

  return undefined
}

/**
 * Fetches the pull request with the given number.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The pull request number to fetch.
 *
 * @returns {PullsGetResponseData} The pull request data.
 */
export const getPullRequest = async (
  repo: Repository,
  number: number
): Promise<PullsGetResponseData | undefined> => {
  try {
    const response = await readClient.pulls.get({
      owner: organizationName(),
      pull_number: number,
      repo,
    })

    return response.data
  } catch (err) {
    if (err.message === 'Pull request not found') {
      return undefined
    }

    throw err
  }

  return undefined
}

/**
 * Assigns owners to the given issue or PR.
 *
 * @param {Repository} repo      The name of the repository that the PR belongs to.
 * @param {number}     number    The PR number.
 * @param {string[]}   usernames The usernames of the users to assign as owners.
 *
 * @returns {PullsRequestReviewersResponseData} The PR data.
 */
export const assignReviewers = async (
  repo: Repository,
  number: number,
  usernames: string[]
): Promise<PullsRequestReviewersResponseData> => {
  const pullRequest = await getPullRequest(repo, number)
  if (isNil(pullRequest)) {
    throw new Error(
      `Could not find the pull request to assign reviewers to (${repo}#${number})`
    )
  }

  // We can't assign the PR owner as a reviewer.
  const reviewers = usernames.filter(
    (username: string) => username !== pullRequest.user.login
  )

  const response = await client.pulls.requestReviewers({
    reviewers,
    pull_number: number,
    owner: organizationName(),
    repo,
  })

  return response.data
}

/**
 * Extracts a pull request from a commit message, in the format "[#123] Do something".
 *
 * @param {string} message The commit message to extract the pull request number from.
 *
 * @returns {number | undefined} The number of the pull request, if one can be found.
 */
export const extractPullRequestNumber = (message: string): number | undefined =>
  parseInt(message.replace(/^.*\[#(\d+)\].*$/, '$1'), 10) || undefined

/**
 * Lists the commits in the pull request with the given number.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The pull request number whose commits we want to fetch.
 *
 * @returns {PullsListCommitsResponseData} The pull request data.
 */
export const listPullRequestCommits = async (
  repo: Repository,
  number: number
): Promise<PullsListCommitsResponseData | undefined> => {
  const response = await readClient.pulls.listCommits({
    owner: organizationName(),
    pull_number: number,
    repo,
  })

  return response.data
}

/**
 * Returns the URL of the pull request with the given number and repo.
 *
 * @param {Repository} repo   The name of the repository that the PR will belong to.
 * @param {number}     number The pull request number to fetch.
 *
 * @returns {string} The URL of the pull request.
 */
export const pullRequestUrl = (repo: Repository, number: number): string =>
  `https://github.com/${organizationName()}/${repo}/pull/${number}`

/**
 * Reviews the given PR using the system Github user.
 *
 * @param {Repository} repo      The name of the repository that the PR belongs to.
 * @param {number}     number    The PR number.
 * @param {string}     event     The type of review ('APPROVE', 'COMMENT' or 'REQUEST_CHANGES').
 * @param {string}     body      The review body.
 *
 * @returns {PullsCreateReviewResponseData} The review data.
 */
export const reviewPullRequest = async (
  repo: Repository,
  number: number,
  event: 'APPROVE' | 'COMMENT' | 'REQUEST_CHANGES',
  body: string
): Promise<PullsCreateReviewResponseData> => {
  const response = await client.pulls.createReview({
    body,
    event,
    owner: organizationName(),
    pull_number: number,
    repo,
  })

  return response.data
}

/**
 * Update the pull request with the given number, and assigns the given param hash.
 *
 * @param {Repository} repo       The name of the repository that the PR belongs to.
 * @param {number}     number     The pull request number to update.
 * @param {object}     attributes The data to update.
 *
 * @returns {PullsGetResponseData} The updated pull request data.
 */
export const updatePullRequest = async (
  repo: Repository,
  number: number,
  attributes: { [key: string]: string }
): Promise<PullsGetResponseData> => {
  const response = await client.pulls.update({
    ...attributes,
    owner: organizationName(),
    pull_number: number,
    repo,
  })

  return response.data as PullsGetResponseData
}
