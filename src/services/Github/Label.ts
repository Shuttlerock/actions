import { info } from '@actions/core'
import {
  IssuesAddLabelsResponseData,
  IssuesSetLabelsResponseData,
} from '@octokit/types'
import Schema from '@octokit/webhooks-types'
import isEqual from 'lodash/isEqual'
import isNil from 'lodash/isNil'

import {
  HasConflictsLabel,
  HasFailuresLabel,
  HasIssuesLabel,
  InProgressLabel,
  PassedReviewLabel,
  PleaseReviewLabel,
} from '@sr-services/Constants'
import { client } from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'
import { getPullRequest } from '@sr-services/Github/PullRequest'
import { organizationName } from '@sr-services/Inputs'

// Certain labels can't co-exist.
const mutuallyExclusiveLabels = [
  [HasConflictsLabel, InProgressLabel, PleaseReviewLabel],
  [HasFailuresLabel, InProgressLabel, PleaseReviewLabel],
  [HasIssuesLabel, InProgressLabel, PleaseReviewLabel],
  [InProgressLabel, PleaseReviewLabel, PassedReviewLabel],
  [HasIssuesLabel, PassedReviewLabel],
]

/**
 * Sets the labels for the given issue or PR, replacing any existing labels.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The PR number.
 * @param {string[]}   labels The list of labels to set.
 * @returns {IssuesSetLabelsResponseData} The PR data.
 */
export const setLabels = async (
  repo: Repository,
  number: number,
  labels?: string[]
): Promise<IssuesSetLabelsResponseData> => {
  const response = await client().issues.setLabels({
    issue_number: number,
    labels,
    owner: organizationName(),
    repo,
  })

  return (response.data as unknown) as IssuesSetLabelsResponseData
}

/**
 * Adds labels to the given issue or PR.
 *
 * @param {Repository} repo   The name of the repository that the PR belongs to.
 * @param {number}     number The PR number.
 * @param {string[]}   added  The labels to add.
 * @returns {IssuesAddLabelsResponseData} The PR data.
 */
export const addLabels = async (
  repo: Repository,
  number: number,
  added: string[]
): Promise<IssuesAddLabelsResponseData> => {
  info(`Fetching the pull request ${repo}#${number}...`)
  const pullRequest = await getPullRequest(repo, number)
  if (isNil(pullRequest)) {
    throw new Error(
      `Could not add labels to ${repo}#${number} - the pull request could not be found`
    )
  }

  const existing = pullRequest.labels.map((lbl: Schema.Label) => lbl.name)
  info(`Existing labels are [${existing.join(', ')}]`)
  info(`The labels [${added.join(', ')}] were added`)

  info('Deciding which labels to remove...')
  const toRemoveRaw = mutuallyExclusiveLabels
    .map((lbls: string[]): string[] =>
      lbls.filter(lbl => added.includes(lbl)).length > 0 ? lbls : []
    )
    .flat()
    .filter((lbl: string) => !added.includes(lbl) && existing.includes(lbl))
  const toRemove = [...new Set(toRemoveRaw)]
  if (toRemove.length > 0) {
    info(`These labels will be removed: '${toRemove.join(', ')}'`)
  } else {
    info('No labels will be removed')
  }

  const toKeepRaw = [
    ...existing.filter((lbl: string) => !toRemove.includes(lbl)),
    ...added,
  ].sort()
  const toKeep = [...new Set(toKeepRaw)]
  await info(`New labels: [${toKeep.join(', ')}]`)

  if (isEqual(existing, toKeep)) {
    info('The labels will not change - giving up')
    return []
  }

  return setLabels(repo, number, toKeep)
}
