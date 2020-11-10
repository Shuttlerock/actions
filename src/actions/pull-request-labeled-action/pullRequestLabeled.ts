import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'

import { GithubWriteUser } from '@sr-services/Constants'
import { addLabels } from '@sr-services/Github'

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestLabeled = async (
  payload: EventPayloads.WebhookPayloadPullRequest
): Promise<void> => {
  const { label, pull_request: pullRequest, repository, sender } = payload

  if (sender.login === GithubWriteUser) {
    info(`This label was added by @${GithubWriteUser} - nothing to do`)
    return
  }

  const added = label?.name as string // We know we have a label for this event.
  await addLabels(repository.name, pullRequest.number, [added])
}
