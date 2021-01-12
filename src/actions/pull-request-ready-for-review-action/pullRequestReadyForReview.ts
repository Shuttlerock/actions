import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'
import isNil from 'lodash/isNil'

import { PleaseReviewLabel } from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import { addLabels, assignReviewers, getIssueKey } from '@sr-services/Github'
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

  info('Fetching repository details...')
  const repo = await fetchRepository(repository.name)
  const reviewers = repo.reviewers.map((user: User) => user.github_username)

  info(`Assigning reviewers (${reviewers.join(', ')})...`)
  if (reviewers.length > 0) {
    await assignReviewers(repository.name, pullRequest.number, reviewers)
  }

  info(`Adding the '${PleaseReviewLabel}' label...`)
  await addLabels(repository.name, pullRequest.number, [PleaseReviewLabel])

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
}
