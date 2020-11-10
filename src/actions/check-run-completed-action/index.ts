import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'

import { checkRunCompleted } from '@sr-actions/check-run-completed-action/checkRunCompleted'

/**
 * Runs whenever a check run completes.
 *
 * To trigger this event manually:
 *
 * $ act --job check_run_completed_action --eventpath src/actions/check-run-completed-action/__tests__/fixtures/check-run-failed-payload.json
 */
export const run = async (): Promise<void> => {
  const { payload } = ((await context) as unknown) as {
    payload: EventPayloads.WebhookPayloadCheckRun
  }
  await checkRunCompleted(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
