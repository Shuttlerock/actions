import { info } from '@actions/core'
import Schema from '@octokit/webhooks-types'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import { extname } from 'path'

import { InfraChangeLabel, PleaseReviewLabel } from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import {
  addLabels,
  assignOwners,
  assignReviewers,
  getIssueKey,
  listPullRequestFiles,
} from '@sr-services/Github'
import { githubWriteToken } from '@sr-services/Inputs'
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

  // Dependabot no longer gives us any inputs to work with. In this case we should just fail gracefully.
  // @see https://github.blog/changelog/2021-02-19-github-actions-workflows-triggered-by-dependabot-prs-will-run-with-read-only-permissions/
  if (isEmpty(githubWriteToken())) {
    info(
      'Organization name was not provided. Perhaps this is a dependabot PR? Giving up...'
    )
    return
  }

  info('Fetching repository details...')
  const repo = await fetchRepository(repository.name)

  const reviewers = repo.reviewers.map((user: User) => user.github_username)
  if (reviewers.length > 0) {
    info(`Assigning reviewers (${reviewers.join(', ')})...`)
    await assignReviewers(repository.name, pullRequest.number, reviewers)
  }

  const owners = repo.leads.map((user: User) => user.github_username)
  if (owners.length > 0) {
    info(`Assigning owners (${owners.join(', ')})...`)
    await assignOwners(repository.name, pullRequest.number, owners)
  }

  info(`Adding the '${PleaseReviewLabel}' label...`)
  const labels = [PleaseReviewLabel]

  // Check the file extensions, and add labels accordingly.
  const files = await listPullRequestFiles(repository.name, pullRequest.number)
  if (files) {
    const extensions = files.map(file => extname(file.filename))
    if (extensions.includes('.tf')) {
      info(`Adding the '${InfraChangeLabel}' label...`)
      labels.push(InfraChangeLabel)
    }
  }

  info('Updating labels...')
  await addLabels(repository.name, pullRequest.number, labels)

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
