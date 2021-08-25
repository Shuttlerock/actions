import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-types'

import { pullRequestClosed } from '@sr-actions/pull-request-closed-action/pullRequestClosed'

/**
 * Runs whenever a pull request is closed (not necessarily merged).
 *
 * To trigger this event manually:
 *
 * $ act --job pull_request_closed_action --eventpath src/actions/pull-request-closed-action/__tests__/fixtures/pull-request-closed.json
 */
export const run = async (): Promise<void> => {
  const { payload } = (await context) as unknown as {
    payload: Schema.PullRequestEvent
  }
  await pullRequestClosed(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
