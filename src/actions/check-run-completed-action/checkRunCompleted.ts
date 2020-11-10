import { error, info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'
import isNil from 'lodash/isNil'

import { GithubWriteUser, HasIssuesLabel } from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import { addLabels, getIssueKey, getPullRequest } from '@sr-services/Github'
import {
  getIssue,
  JiraStatusHasIssues,
  setIssueStatus,
} from '@sr-services/Jira'
import { sendUserMessage } from '@sr-services/Slack'

/**
 * Runs whenever a check run completes.
 *
 * @param {WebhookPayloadCheckRun} payload The JSON payload from Github sent when the run completes.
 */
export const checkRunCompleted = async (
  payload: EventPayloads.WebhookPayloadCheckRun
): Promise<void> => {
  const { check_run: checkRun, repository } = payload

  if (checkRun.pull_requests.length === 0) {
    info('There are no pull requests associated with this check run - ignoring')
    return
  }

  // Used for log messages.
  const prName = `${repository.name}#${checkRun.pull_requests[0].number}`

  if (checkRun.conclusion !== 'failure') {
    info(`${prName} didn't fail - ignoring`)
    return
  }

  info(`Fetching the pull request ${prName}`)
  const pullRequest = await getPullRequest(
    repository.name,
    checkRun.pull_requests[0].number
  )
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

  info(`Adding the '${HasIssuesLabel}' label...`)
  await addLabels(repository.name, pullRequest.number, [HasIssuesLabel])

  if (issue.fields.status.name !== JiraStatusHasIssues) {
    info(`Moving Jira issue ${issueKey} to '${JiraStatusHasIssues}'...`)
    await setIssueStatus(issue.id, JiraStatusHasIssues)
  }

  if (issue.fields.assignee) {
    info('Sending a Slack message to the Jira assignee...')
    const credentialLookup =
      issue.fields.assignee.emailAddress || issue.fields.assignee.displayName
    try {
      const credentials = await fetchCredentials(credentialLookup)
      if (credentials.github_username !== GithubWriteUser) {
        const message = `A check has failed for _<${pullRequest.html_url}|${pullRequest.title}>_`
        await sendUserMessage(credentials.slack_id, message)
      }
    } catch (err) {
      error(err)
    }
  }
}
