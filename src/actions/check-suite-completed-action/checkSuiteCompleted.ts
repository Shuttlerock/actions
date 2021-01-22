import { error, info } from '@actions/core'
import { PullsGetResponseData } from '@octokit/types'
import { EventPayloads } from '@octokit/webhooks'
import isNil from 'lodash/isNil'

import { GithubWriteUser, HasIssuesLabel } from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import {
  addLabels,
  extractPullRequestNumber,
  getCommit,
  getIssueKey,
  getPullRequest,
  Repository,
} from '@sr-services/Github'
import {
  getIssue,
  Issue,
  JiraStatusHasIssues,
  setIssueStatus,
} from '@sr-services/Jira'
import { positiveEmoji, sendUserMessage } from '@sr-services/Slack'

/**
 * Performs actions when a check suite fails.
 *
 * @param {string}               checkName   The name of the Github app running the check.
 * @param {Issue}                issue       The Jira issue that the PR is linked to.
 * @param {Repository}           repoName    The name of the Github repository.
 * @param {PullsGetResponseData} pullRequest The pull request being checked.
 *
 * @returns {string | undefined} A message to be sent to the user in Slack.
 */
const handleFailure = async (
  checkName: string,
  issue: Issue,
  repoName: Repository,
  pullRequest: PullsGetResponseData
): Promise<string | undefined> => {
  info(`Adding the '${HasIssuesLabel}' label...`)
  await addLabels(repoName, pullRequest.number, [HasIssuesLabel])

  if (issue.fields.status.name === JiraStatusHasIssues) {
    info(
      `Issue ${issue.key} is already in '${JiraStatusHasIssues}' - giving up`
    )
    return undefined
  }

  info(`Moving Jira issue ${issue.key} to '${JiraStatusHasIssues}'...`)
  await setIssueStatus(issue.id, JiraStatusHasIssues)

  return `Check suite _*${checkName}*_ failed for _<${pullRequest.html_url}|${pullRequest.title}>_`
}

/**
 * Performs actions when a check suite succeeds.
 *
 * @param {string}               checkName   The name of the Github app running the check.
 * @param {PullsGetResponseData} pullRequest The pull request being checked.
 *
 * @returns {string | undefined} A message to be sent to the user in Slack.
 */
const handleSuccess = (
  checkName: string,
  pullRequest: PullsGetResponseData
): string | undefined => {
  return `Check suite _*${checkName}*_ passed for _<${pullRequest.html_url}|${
    pullRequest.title
  }>_ ${positiveEmoji()}`
}

/**
 * Runs whenever a check suite completes.
 *
 * @param checkSuite The check suite payload from Github sent when the suite completes.
 */
export const checkSuiteCompleted = async (
  checkSuite: EventPayloads.WebhookPayloadCheckSuiteCheckSuite
): Promise<void> => {
  const rgx = new RegExp('^.+/repos/[^/]+/([^/]+).*$')
  const repoName = checkSuite.url.replace(rgx, '$1')
  info(
    `Fetching the commit ${checkSuite.after} for repository '${repoName}'...`
  )
  const commit = await getCommit(repoName, checkSuite.after)
  if (isNil(commit)) {
    error(`Couldn't find commit ${checkSuite.after} - giving up`)
    return
  }

  info('Looking for an associated pull request number...')
  let prNumber = extractPullRequestNumber(commit.message)
  if (isNil(prNumber) && checkSuite.pull_requests.length > 0) {
    prNumber = checkSuite.pull_requests[0].number
  }

  if (isNil(prNumber)) {
    info(
      'There are no pull requests associated with this check suite - ignoring'
    )
    return
  }

  // Used for log messages.
  const prName = `${repoName}#${prNumber}`

  info(`Fetching the pull request ${prName}`)
  const pullRequest = await getPullRequest(repoName, prNumber)
  if (isNil(pullRequest)) {
    error(`Could not fetch the pull request ${prName}`)
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

  let message: string | undefined
  const checkName = checkSuite.app.name
  if (checkSuite.conclusion === 'failure') {
    info('The suite has failed')
    message = await handleFailure(checkName, issue, repoName, pullRequest)
  } else if (checkSuite.conclusion === 'success') {
    info('The suite has passed')
    message = handleSuccess(checkName, pullRequest)
  }

  if (issue.fields.assignee && !isNil(message)) {
    info('Sending a Slack message to the Jira assignee...')
    const credentialLookup =
      issue.fields.assignee.emailAddress || issue.fields.assignee.displayName
    try {
      const credentials = await fetchCredentials(credentialLookup)
      if (credentials.github_username !== GithubWriteUser) {
        await sendUserMessage(credentials.slack_id, message)
      }
    } catch (err) {
      error(err)
    }
  }
}
