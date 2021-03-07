import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-definitions/schema'

import { pullRequestReviewed } from '@sr-actions/pull-request-reviewed-action/pullRequestReviewed'

/**
 * Runs whenever a pull request is reviewed.
 *
 * To trigger this event manually:
 *
 * $ act --job pull_request_reviewed_action --eventpath src/actions/pull-request-reviewed-action/__tests__/fixtures/pull-request-reviewed.json
 */
export const run = async (): Promise<void> => {
  const { payload } = ((await context) as unknown) as {
    payload: Schema.PullRequestReviewSubmittedEvent
  }
  await pullRequestReviewed(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
