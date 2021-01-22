import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'

import { checkSuiteCompleted } from '@sr-actions/check-suite-completed-action/checkSuiteCompleted'

/**
 * Runs whenever a check run completes.
 *
 * To trigger this event manually:
 *
 * $ act --job check_run_completed_action --eventpath src/actions/check-run-completed-action/__tests__/fixtures/check-run-success-payload.json
 */
export const run = async (): Promise<void> => {
  const {
    payload: {
      check_run: { check_suite: checkSuite },
    },
  } = ((await context) as unknown) as {
    payload: EventPayloads.WebhookPayloadCheckRun
  }
  await checkSuiteCompleted(
    checkSuite as EventPayloads.WebhookPayloadCheckSuiteCheckSuite
  )
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
