import { error, info } from '@actions/core'
import isNil from 'lodash/isNil'

import { fetchCredentials, fetchRepository } from '@sr-services/Credentials'
import { pullRequestUrl, reviewPullRequest } from '@sr-services/Github'
import {
  negativeEmoji,
  positiveEmoji,
  sendUserMessage,
} from '@sr-services/Slack'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/approvePullRequest.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "approvePullRequest", "param": "actions#344" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email     The email address of the user who requested the release be created.
 * @param {string} repoAndPr The name of the repository and the pull request number together (eg. 'actions#344').
 */
export const approvePullRequest = async (
  email: string,
  repoAndPr: string
): Promise<void> => {
  const [repoName, prStr] = repoAndPr.trim().split(/[\s#]+/)
  const prNumber = parseInt(prStr, 10)
  if (isNil(repoName) || isNil(prNumber)) {
    error(
      `Repository name and pull request number could not be extracted from '${repoAndPr}' - giving up`
    )
    return
  }

  info(`User ${email} requested approval of ${repoName}#${prNumber}...`)
  info(`Fetching credentials for '${email}'...`)
  const credentials = await fetchCredentials(email)

  info(`Fetching the repository '${repoName}'...`)
  const repo = await fetchRepository(repoName)

  if (!repo.allow_auto_review) {
    const message = `The repository _*${repoName}*_ is not whitelisted for auto-approval`
    error(message)
    await sendUserMessage(credentials.slack_id, `${message} ${negativeEmoji()}`)
    return
  }

  await reviewPullRequest(repoName, prNumber, 'APPROVE', ':thumbsup:')
  info(`Approved ${repoName}#${prNumber}`)

  info(`Sending ${email} a success message on Slack...`)
  const message = `The pull request _<${pullRequestUrl(
    repoName,
    prNumber
  )}|${repoName}#${prNumber}>_ has been approved ${positiveEmoji()}`
  await sendUserMessage(credentials.slack_id, message)
  info('Finished')
}
