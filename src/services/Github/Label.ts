import {
  IssuesAddLabelsResponseData,
  IssuesSetLabelsResponseData,
} from '@octokit/types'

import { client } from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'
import { organizationName } from '@sr-services/Inputs'

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
    owner: organizationName(),
    repo,
  })

  return response.data
}

/**
 * Sets the labels for the given issue or PR, replacing any existing labels.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The PR number.
 * @param {string[]}   labels The list of labels to set.
 *
 * @returns {IssuesSetLabelsResponseData} The PR data.
 */
export const setLabels = async (
  repo: Repository,
  number: number,
  labels?: string[]
): Promise<IssuesSetLabelsResponseData> => {
  const response = await client.issues.setLabels({
    issue_number: number,
    labels,
    owner: organizationName(),
    repo,
  })

  return response.data
}
