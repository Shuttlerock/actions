import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'

import { checkSuiteCompleted } from '@sr-actions/check-suite-completed-action/checkSuiteCompleted'

/**
 * Runs whenever a check run completes.
 *
 * To trigger this event manually:
 *
 * $ act --job check_suite_completed_action --eventpath src/actions/check-suite-completed-action/__tests__/fixtures/check-suite-success-payload.json
 */
export const run = async (): Promise<void> => {
  const {
    payload: { check_suite: checkSuite },
  } = ((await context) as unknown) as {
    payload: EventPayloads.WebhookPayloadCheckSuite
  }
  await checkSuiteCompleted(checkSuite)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
