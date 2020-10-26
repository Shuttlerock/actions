import { info } from '@actions/core'
import isNil from 'lodash/isNil'

import { InProgressLabel } from '@sr-services/Constants'
import {
  addLabels,
  createBranch,
  createPullRequest,
  getBranch,
  getRepository,
} from '@sr-services/Github'
import {
  githubWriteToken,
  jiraHost,
  organizationName,
} from '@sr-services/Inputs'
import { getIssuePullRequestNumbers, Issue } from '@sr-services/Jira/Issue'
import { parameterize } from '@sr-services/String'
import { PullRequestForEpicTemplate, render } from '@sr-services/Template'

/**
 * Creates a pull request for the given Jira epic.
 *
 * @param {Issue} epic            The Jira epic we will create the pull request for.
 * @param {string} repositoryName Jira Epics don't have a repository - if we encounter an issue
 *                                belonging to an epic, we will use the child issue's repository.
 */
export const createEpicPullRequest = async (
  epic: Issue,
  repositoryName: string
): Promise<void> => {
  const newBranchName = `sr-devops/${parameterize(epic.key)}-${parameterize(
    epic.fields.summary
  )}`
  const jiraUrl = `https://${jiraHost()}/browse/${epic.key}`
  info(`The Jira URL is ${jiraUrl}`)

  info('Checking if there is an open pull request for this epic...')
  let pullRequestNumber
  const repo = await getRepository(repositoryName)
  const pullRequestNumbers = await getIssuePullRequestNumbers(epic.id)

  if (pullRequestNumbers.length > 0) {
    ;[pullRequestNumber] = pullRequestNumbers
    info(`Pull request #${pullRequestNumber} already exists`)
  } else {
    info('There is no open pull request for this issue')

    const baseBranchName = repo.default_branch
    const branch = await getBranch(repo.name, newBranchName)

    info(`Checking if the branch '${newBranchName}' already exists...`)
    if (isNil(branch)) {
      info(
        `The branch '${newBranchName}' does not exist yet: creating a new branch...`
      )
      await createBranch(
        repo.name,
        baseBranchName,
        newBranchName,
        `.meta/${epic.key}.md`,
        `${jiraUrl}\n\nCreated at ${new Date().toISOString()}`,
        `[${epic.key}] [skip ci] Create pull request.`
      )
    }

    info('Creating the pull request...')
    const prTitle = `[${epic.key}] ${epic.fields.summary}`
    const templateVars = {
      description: epic.fields.description || '',
      issueType: epic.fields.issuetype.name,
      summary: epic.fields.summary,
      jiraUrl,
    }
    const prBody = render(PullRequestForEpicTemplate, templateVars)
    const pullRequest = await createPullRequest(
      repo.name,
      baseBranchName,
      newBranchName,
      prTitle,
      prBody,
      githubWriteToken()
    )

    pullRequestNumber = pullRequest.number
    info(`Created pull request #${pullRequestNumber}`)
  }

  info('Adding labels...')
  await addLabels(repo.name, pullRequestNumber, [InProgressLabel])

  const url = `https://github.com/${organizationName()}/${
    repo.name
  }/pull/${pullRequestNumber}`
  info(`Finished creating pull request ${url} for Jira epic ${epic.key}`)
}
