import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-types'

import { pullRequestConvertedToDraft } from '@sr-actions/pull-request-converted-to-draft-action/pullRequestConvertedToDraft'

/**
 * Runs whenever a pull request is marked as 'converted to draft'.
 *
 * To trigger this event manually:
 *
 * $ act --job pull_request_converted_to_draft_action --eventpath src/actions/pull-request-converted-to-draft-action/__tests__/fixtures/pull-request-converted-to-draft.json
 */
export const run = async (): Promise<void> => {
  const { payload } = (await context) as unknown as {
    payload: Schema.PullRequestEvent
  }
  await pullRequestConvertedToDraft(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
