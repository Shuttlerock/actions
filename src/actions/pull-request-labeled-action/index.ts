import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-types'

import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'

/**
 * Runs whenever a pull request is labeled.
 *
 * To trigger this event manually:
 *
 * $ act --job pull_request_labeled_action --eventpath src/actions/pull-request-labeled-action/__tests__/fixtures/pull-request-labeled.json
 */
export const run = async (): Promise<void> => {
  const { payload } = (await context) as unknown as {
    payload: Schema.PullRequestLabeledEvent
  }
  await pullRequestLabeled(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
