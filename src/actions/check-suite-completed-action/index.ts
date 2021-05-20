import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-definitions/schema'

import { checkSuiteCompleted } from '@sr-actions/check-suite-completed-action/checkSuiteCompleted'

/**
 * Runs whenever a check run completes.
 *
 * To trigger this event manually:
 *
 * $ act --job check_suite_completed_action --eventpath src/actions/check-suite-completed-action/__tests__/fixtures/check-suite-success-payload.json
 */
export const run = async (): Promise<void> => {
  const { payload } = (await context) as unknown as {
    payload: Schema.CheckSuiteEvent
  }
  await checkSuiteCompleted(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
