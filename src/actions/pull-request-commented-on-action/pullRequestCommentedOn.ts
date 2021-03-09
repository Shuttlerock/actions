import Schema from '@octokit/webhooks-definitions/schema'

import { Build } from '@sr-services/CircleCI'

/**
 * Runs whenever a pull request is closed (not necessarily merged).
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when an comment is created
 */
export const pullRequestCommentedOn = async (payload: Schema.IssueCommentCreatedEvent): Promise<void> => {
  // const { pull_request: pullRequest, repository } = payload

  const response = await Build()
  error(response)
}
