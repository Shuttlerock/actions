import { error, info } from '@actions/core'
import isNil from 'lodash/isNil'
import truncate from 'lodash/truncate'

import { InProgressLabel } from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import {
  addLabels,
  assignOwners,
  createBranch,
  createEpicPullRequest,
  createPullRequest,
  getBranch,
  getRepository,
  pullRequestUrl,
} from '@sr-services/Github'
import {
  getEpic,
  getIssue,
  getIssuePullRequestNumbers,
  issueUrl,
  JiraLabelSkipPR,
} from '@sr-services/Jira'
import { sendUserMessage } from '@sr-services/Slack'
import { parameterize } from '@sr-services/String'
import { PullRequestForIssueTemplate, render } from '@sr-services/Template'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/createPullRequestForJiraIssue.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "createPullRequestForJiraIssue", "param": "STUDIO-232" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email       The email address of the user who will own the pull request.
 * @param {string} userCommand The command given by the user of the Jira issue we will base the pull request on.
 */
export const createPullRequestForJiraIssue = async (
  email: string,
  userCommand: string
): Promise<void> => {
  const [issueKey, repositoryName] = userCommand.trim().split(/\s+/)

  info(`Creating a pull request for issue ${issueKey} / ${email}`)
  info('Fetching the Jira issue details...')
  const issue = await getIssue(issueKey)
  if (isNil(issue)) {
    const credentials = await fetchCredentials(email)
    const message = `Issue ${issueKey} could not be found, so no pull request was created`
    await sendUserMessage(credentials.slack_id, message)
    error(message)
    return
  }

  const jiraUrl = issueUrl(issue.key)
  // If no repository is supplied then it will default to the Jira issue repository.
  const repository =
    repositoryName ||
    issue.fields.repository ||
    (issue.fields?.components || [])[0]?.name
  info(`The Jira URL is ${jiraUrl}`)

  info('Finding out who the pull request should belong to...')
  if (isNil(issue.fields.assignee)) {
    // If this issue was transitioned via automation, we won't have anyone to send messages to.
    if (!isNil(email)) {
      const credentials = await fetchCredentials(email)
      const message = `Issue <${jiraUrl}|${issue.key}> is not assigned to anyone, so no pull request was created`
      await sendUserMessage(credentials.slack_id, message)
      error(message)
    }
    return
  }
  const credentialLookup =
    issue.fields.assignee.emailAddress || issue.fields.assignee.displayName
  const credentials = await fetchCredentials(credentialLookup)
  const assigneeEmail = credentials.email
  const assigneeName = assigneeEmail.replace(/^([^@.]+).*$/, '$1') // Grab the first name from the email address.
  const newBranchName = truncate(
    `${parameterize(assigneeName)}/${parameterize(issue.key)}-${parameterize(
      issue.fields.summary
    )}`,
    { length: 80, omission: '', separator: '-' }
  )
  info(`The pull request will be assigned to @${credentials.github_username}`)

  if ((issue.fields.subtasks || []).length > 0) {
    const message = `Issue <${jiraUrl}|${issue.key}> has subtasks, so no pull request was created`
    info(message)
    await sendUserMessage(credentials.slack_id, message)
    return
  }

  if (isNil(repository)) {
    const message = `No repository is set for issue <${jiraUrl}|${issue.key}>, so no pull request was created`
    error(message)
    await sendUserMessage(credentials.slack_id, message)
    return
  }

  if (isNil(issue.fields.storyPointEstimate)) {
    const message = `No point estimate is set for issue <${jiraUrl}|${issue.key}>, so no pull request was created`
    error(message)
    await sendUserMessage(credentials.slack_id, message)
    return
  }

  info('Checking if there is an open pull request for this issue...')
  let pullRequestNumber
  const repo = await getRepository(repository)
  const pullRequestNumbers = await getIssuePullRequestNumbers(
    issue.id,
    repo.name
  )

  if (pullRequestNumbers.length > 0) {
    ;[pullRequestNumber] = pullRequestNumbers
    info(`Pull request #${pullRequestNumber} already exists`)
  } else {
    info('There is no open pull request for this issue')
    info("Notifying the user that we're making a pull request...")
    const message = `Creating a pull request for *<${jiraUrl}|${issue.key}>*...`
    await sendUserMessage(credentials.slack_id, message)

    let baseBranchName = repo.default_branch
    const branch = await getBranch(repo.name, newBranchName)

    // Decide if this is an epic.
    const epic = await getEpic(issue.key)
    if (
      epic &&
      !epic.fields.labels?.includes(JiraLabelSkipPR) &&
      !issue.fields.labels?.includes(JiraLabelSkipPR)
    ) {
      info(
        `Issue ${issue.key} belongs to epic ${epic.key} - creating an Epic pull request.`
      )
      const epicPr = await createEpicPullRequest(epic, repository)
      baseBranchName = epicPr.head.ref
    }

    info(`Checking if the branch '${newBranchName}' already exists...`)
    if (isNil(branch)) {
      info(
        `The branch '${newBranchName}' does not exist yet: creating a new branch...`
      )
      await createBranch(
        repo.name,
        baseBranchName,
        newBranchName,
        {
          [`.meta/${issue.key}.md`]: `${jiraUrl}\n\nCreated at ${new Date().toISOString()}`,
        },
        `build: [${issue.key}] [skip ci] [skip netlify] create pull request`
      )
    }

    info('Creating the pull request...')
    const prTitle = `[${issue.key}] ${issue.fields.summary}`
    const templateVars = {
      belongsToEpic: !!epic,
      description: issue.fields.description || '',
      epicUrl: epic && issueUrl(epic.key),
      issueType: issue.fields.issuetype.name,
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
    info(`Created pull request #${pullRequestNumber}`)
    // Sleep a little bit before we continue - we have been getting 404s trying to fetch the PR again straight after creating it.
    await new Promise(r => setTimeout(r, 2000))
  }

  // 7. Mark the pull request as in-progress.
  info(
    `Adding the '${InProgressLabel}' label to ${repo.name}#${pullRequestNumber}...`
  )
  await addLabels(repo.name, pullRequestNumber, [InProgressLabel])

  info(`Assigning @${credentials.github_username} as the owner...`)
  await assignOwners(repo.name, pullRequestNumber, [
    credentials.github_username,
  ])

  info(`Notifying Slack user ${credentials.slack_id}...`)
  const url = pullRequestUrl(repo.name, pullRequestNumber)

  const message =
    `Here's your pull request: *<${url}|${repo.name}#${pullRequestNumber}>*
    Please prefix your commits with \`[#${pullRequestNumber}] [${issue.key}]\`\n
    Checkout the new branch with:
    \`git checkout --track origin/${newBranchName}\`
  `.replace(/[ ]+/g, ' ')
  await sendUserMessage(credentials.slack_id, message)
  info(`Finished creating pull request ${url} for Jira issue ${issue.key}`)
}
