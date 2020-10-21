import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'
import isNil from 'lodash/isNil'

import { PleaseReviewLabel } from '@sr-services/Constants'
import { addLabels, getIssueKey } from '@sr-services/Github'
import {
  getIssue,
  JiraStatusTechReview,
  setIssueStatus,
} from '@sr-services/Jira'

/**
 * Runs whenever a pull request is marked as 'ready for review'.
 *
 * @param {} payload The JSON payload from Github sent when a pull request is updated.
 */
export const pullRequestReadyForReview = async (
  payload: EventPayloads.WebhookPayloadPullRequest
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

  if (issue.fields.status.name === JiraStatusTechReview) {
    info(
      `Jira issue ${issueKey} is already in '${JiraStatusTechReview}' - ignoring`
    )
    return
  }

  info(`Moving Jira issue ${issueKey} to '${JiraStatusTechReview}'...`)
  await setIssueStatus(issue.id, JiraStatusTechReview)

  info(`Adding the '${PleaseReviewLabel}' label...`)
  await addLabels(repository.name, pullRequest.number, [PleaseReviewLabel])
}