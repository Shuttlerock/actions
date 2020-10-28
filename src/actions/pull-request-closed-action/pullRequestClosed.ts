import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'
import isNil from 'lodash/isNil'

import { getIssueKey } from '@sr-services/Github'
import {
  getIssue,
  JiraStatusValidated,
  setIssueStatus,
} from '@sr-services/Jira'

/**
 * Runs whenever a pull request is closed (not necessarily merged).
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is closed.
 */
export const pullRequestClosed = async (
  payload: EventPayloads.WebhookPayloadPullRequest
): Promise<void> => {
  const { pull_request: pullRequest, repository } = payload

  // Used for log messages.
  const prName = `${repository.name}#${pullRequest.number}`

  if (!pullRequest.merged) {
    info(`${prName} is not merged - ignoring`)
    return
  }

  info(`Getting the Jira key from the pull request ${prName}...`)
  const issueKey = getIssueKey(pullRequest)
  if (isNil(issueKey)) {
    info(`Couldn't extract a Jira issue key from ${prName} - ignoring`)
    return
  }

  info(`Fetching the Jira issue ${issueKey}...`)
  const issue = await getIssue(issueKey)
  if (isNil(issue)) {
    info(`Couldn't find a Jira issue for ${prName} - ignoring`)
    return
  }

  if (issue.fields.status.name === JiraStatusValidated) {
    info(
      `Jira issue ${issueKey} is already in '${JiraStatusValidated}' - ignoring`
    )
    return
  }

  info(`Moving Jira issue ${issueKey} to '${JiraStatusValidated}'...`)
  await setIssueStatus(issue.id, JiraStatusValidated)
}
