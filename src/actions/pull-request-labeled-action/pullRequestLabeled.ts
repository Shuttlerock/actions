import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'

import {
  GithubWriteUser,
  HasConflictsLabel,
  HasFailuresLabel,
  HasIssuesLabel,
  InProgressLabel,
  PassedReviewLabel,
  PleaseReviewLabel,
} from '@sr-services/Constants'
import { setLabels } from '@sr-services/Github'

// Certain labels can't co-exist.
const mutuallyExclusiveLabels = [
  [HasConflictsLabel, InProgressLabel, PleaseReviewLabel],
  [HasFailuresLabel, InProgressLabel, PleaseReviewLabel],
  [HasIssuesLabel, InProgressLabel, PleaseReviewLabel],
  [InProgressLabel, PleaseReviewLabel, PassedReviewLabel],
  [HasIssuesLabel, PassedReviewLabel],
]

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestLabeled = async (
  payload: EventPayloads.WebhookPayloadPullRequest
): Promise<void> => {
  const { label, pull_request: pullRequest, repository, sender } = payload

  if (sender.login === GithubWriteUser) {
    info(`This label was added by @${GithubWriteUser} - nothing to do`)
    return
  }

  const added = label?.name as string // We know we have a label for this event.
  const existing = pullRequest.labels.map(
    (lbl: EventPayloads.WebhookPayloadPullRequestLabel) => lbl.name
  )
  info(`Existing labels are [${existing.join(', ')}]`)
  info(`The label '${added}' was added`)

  info('Deciding which labels to remove...')
  const toRemoveRaw = mutuallyExclusiveLabels
    .map((labels: string[]): string[] => (labels.includes(added) ? labels : []))
    .flat()
    .filter((lbl: string) => lbl !== added && existing.includes(lbl))
  const toRemove = [...new Set(toRemoveRaw)]

  if (toRemove.length === 0) {
    info('No labels need to be removed - giving up')
    return
  }

  info(`These labels will be removed: '${toRemove.join(', ')}'`)
  const toKeep = [
    ...existing.filter((lbl: string) => !toRemove.includes(lbl)),
    added,
  ].sort()
  await info(`Setting new labels: ${toKeep.join(', ')}]`)
  await setLabels(repository.name, pullRequest.number, toKeep)
}
