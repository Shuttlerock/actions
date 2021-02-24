import { info } from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'
import isNil from 'lodash/isNil'

import { InProgressLabel } from '@sr-services/Constants'
import { addLabels, getIssueKey } from '@sr-services/Github'
import {
  getIssue,
  JiraStatusInDevelopment,
  setIssueStatus,
} from '@sr-services/Jira'

/**
 * Runs whenever a pull request is marked as 'converted to draft'.
 *
 * @param {} payload The JSON payload from Github sent when a pull request is updated.
 */
export const pullRequestConvertedToDraft = async (
  payload: Schema.PullRequestEvent
): Promise<void> => {
  const { pull_request: pullRequest, repository } = payload

  // Used for log messages.
  const prName = `${repository.name}#${pullRequest.number}`

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

  if (issue.fields.status.name === JiraStatusInDevelopment) {
    info(
      `Jira issue ${issueKey} is already in '${JiraStatusInDevelopment}' - ignoring`
    )
    return
  }

  info(`Moving Jira issue ${issueKey} to '${JiraStatusInDevelopment}'...`)
  await setIssueStatus(issue.id, JiraStatusInDevelopment)

  info(`Adding the '${InProgressLabel}' label...`)
  await addLabels(repository.name, pullRequest.number, [InProgressLabel])
}
