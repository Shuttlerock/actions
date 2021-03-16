import { info } from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'
import isNil from 'lodash/isNil'

import { PleaseReviewLabel } from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import { addLabels, assignReviewers, getIssueKey } from '@sr-services/Github'
import { getReviewColumn, getIssue, setIssueStatus } from '@sr-services/Jira'

/**
 * Runs whenever a pull request is marked as 'ready for review'.
 *
 * @param {} payload The JSON payload from Github sent when a pull request is updated.
 */
export const pullRequestReadyForReview = async (
  payload: Schema.PullRequestEvent
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
  if (isNil(issue.fields.project)) {
    info(`Couldn't find a project for Jira issue ${issueKey} - ignoring`)
    return
  }

  // Some boards use 'Review' rather than 'Tech review'.
  const reviewColumn = await getReviewColumn(issue.fields.project.id)

  if (issue.fields.status.name === reviewColumn) {
    info(`Jira issue ${issueKey} is already in '${reviewColumn}' - ignoring`)
    return
  }

  info(`Moving Jira issue ${issueKey} to '${reviewColumn}'...`)
  await setIssueStatus(issue.id, reviewColumn)
}
