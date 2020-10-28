import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'

import { pullRequestReadyForReview } from '@sr-actions/pull-request-ready-for-review-action/pullRequestReadyForReview'

/**
 * Runs whenever a pull request is marked as 'ready for review'.
 *
 * To trigger this event manually:
 *
 * $ act --job pull_request_ready_for_review_action --eventpath src/actions/pull-request-ready-for-review-action/__tests__/fixtures/pull-request-ready-for-review.json
 */
export const run = async (): Promise<void> => {
  const { payload } = ((await context) as unknown) as {
    payload: EventPayloads.WebhookPayloadPullRequest
  }
  await pullRequestReadyForReview(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
