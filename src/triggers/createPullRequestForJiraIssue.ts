import { info } from '@actions/core'
import isUndefined from 'lodash/isUndefined'

import {
  InProgressLabel,
  JiraHost,
  OrganizationName,
} from '@sr-services/Constants'
import { getCredentialsByEmail } from '@sr-services/Credentials'
import {
  addLabels,
  assignOwners,
  createBranch,
  createPullRequest,
  getBranch,
  getRepository,
} from '@sr-services/github'
import { getIssue, getIssuePullRequestNumbers } from '@sr-services/jira'
import { sendUserMessage } from '@sr-services/Slack'
import { parameterize } from '@sr-services/String'
import { PullRequestForIssueTemplate, render } from '@sr-services/Template'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/createPullRequestForJiraIssue.ts.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "createPullRequestForJiraIssue", "param": "STUDIO-232" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} _email   The email address of the user who will own the pull request.
 * @param {string} issueKey The key of the Jira issue we will base the pull request on.
 */
export const createPullRequestForJiraIssue = async (
  _email: string,
  issueKey: string
): Promise<void> => {
  // 1. Fetch the Jira issue details.
  const issue = await getIssue(issueKey)

  const jiraUrl = `https://${JiraHost}/browse/${issue.key}`

  // 2. Find out who the PR should belong to.
  if (issue.fields.assignee === null) {
    throw new Error(
      `Issue ${issue.key} is not assigned to anyone, so no pull request will be created`
    )
  }
  const assigneeEmail = issue.fields.assignee.emailAddress
  const credentials = await getCredentialsByEmail(assigneeEmail)

  if (issue.fields.subtasks.length > 0) {
    info(`Issue ${issue.key} has subtasks, so no pull request will be created`)
    return
  }

  if (isUndefined(issue.fields.repository)) {
    throw new Error(`No repository was set for issue ${issue.key}`)
  }

  // 3. Check if a PR already exists for the issue.
  let pullRequestNumber
  const repo = await getRepository(issue.fields.repository)
  const pullRequestNumbers = await getIssuePullRequestNumbers(issue.id)

  if (pullRequestNumbers.length > 0) {
    ;[pullRequestNumber] = pullRequestNumbers
  } else {
    // 4. Try to find an existing branch.
    const baseBranchName = repo.default_branch
    const newBranchName = parameterize(`${issue.key}-${issue.fields.summary}`)
    const branch = await getBranch(repo.name, newBranchName)

    // 5. If no branch exists with the right name, make a new one.
    if (isUndefined(branch)) {
      await createBranch(
        repo.name,
        baseBranchName,
        newBranchName,
        `${jiraUrl}\n\nCreated at ${new Date().toISOString()}`,
        `.meta/${issue.key}.md`,
        `[${issue.key}] [skip ci] Create pull request.`
      )
    }

    // 6. Create the pull request.
    const prTitle = `[${issue.key}] ${issue.fields.summary}`
    const templateVars = {
      description: issue.fields.description,
      summary: issue.fields.summary,
      jiraUrl,
    }
    const prBody = render(PullRequestForIssueTemplate, templateVars)
    const pullRequest = await createPullRequest(
      repo.name,
      baseBranchName,
      newBranchName,
      prTitle,
      prBody,
      credentials.github_token
    )

    pullRequestNumber = pullRequest.number
  }

  // 7. Mark the pull request as in-progress.
  await addLabels(repo.name, pullRequestNumber, [InProgressLabel])

  // 8. Assign the pull request to the appropriate user.
  await assignOwners(repo.name, pullRequestNumber, [
    credentials.github_username,
  ])

  // 9. Tell the user.
  const url = `https://github.com/${OrganizationName}/${repo.name}/pull/${pullRequestNumber}`
  const message = `Here's your pull request: ${url}`
  await sendUserMessage(credentials.slack_id, message)

  // Todo:
  // - Send errors to Slack.
  // - Refactor branch and pull request creation into library methods.
  // - Check before adding labels or assigning an owner?
  // - Add tests.
  // - Handle epic PRs.
}
