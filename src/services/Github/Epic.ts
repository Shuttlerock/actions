import { info } from '@actions/core'
import { PullsGetResponseData } from '@octokit/types'
import isNil from 'lodash/isNil'

import { EpicLabel, InProgressLabel } from '@sr-services/Constants'
import { createBranch, getBranch } from '@sr-services/Github/Branch'
import { addLabels } from '@sr-services/Github/Label'
import {
  createPullRequest,
  getPullRequest,
  pullRequestUrl,
} from '@sr-services/Github/PullRequest'
import { getRepository } from '@sr-services/Github/Repository'
import { githubWriteToken } from '@sr-services/Inputs'
import { getIssuePullRequestNumbers, Issue, issueUrl } from '@sr-services/Jira'
import { parameterize } from '@sr-services/String'
import { PullRequestForEpicTemplate, render } from '@sr-services/Template'

/**
 * Creates a pull request for the given Jira epic.
 *
 * @param {Issue} epic            The Jira epic we will create the pull request for.
 * @param {string} repositoryName Jira Epics don't have a repository - if we encounter an issue
 *                                belonging to an epic, we will use the child issue's repository.
 *
 * @returns {PullsGetResponseData} The pull request data.
 */
export const createEpicPullRequest = async (
  epic: Issue,
  repositoryName: string
): Promise<PullsGetResponseData> => {
  const newBranchName = `sr-devops/${parameterize(epic.key)}-${parameterize(
    epic.fields.summary
  )}`
  const jiraUrl = issueUrl(epic.key)
  info(`The Jira URL is ${jiraUrl}`)

  info('Checking if there is an open pull request for this epic...')
  let pullRequestNumber
  const repo = await getRepository(repositoryName)
  const pullRequestNumbers = await getIssuePullRequestNumbers(
    epic.id,
    repo.name
  )

  if (pullRequestNumbers.length > 0) {
    ;[pullRequestNumber] = pullRequestNumbers
    info(`Pull request #${pullRequestNumber} already exists`)
  } else {
    info('There is no open pull request for this epic')

    const baseBranchName = repo.default_branch
    const branch = await getBranch(repo.name, newBranchName)

    info(`Checking if the epic branch '${newBranchName}' already exists...`)
    if (isNil(branch)) {
      info(
        `The epic branch '${newBranchName}' does not exist yet: creating a new branch...`
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

    info('Creating the epic pull request...')
    const prTitle = `[${epic.key}] [Epic] ${epic.fields.summary}`
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
    info(`Created epic pull request #${pullRequestNumber}`)
  }

  info('Adding epic labels...')
  await addLabels(repo.name, pullRequestNumber, [EpicLabel, InProgressLabel])

  const url = pullRequestUrl(repo.name, pullRequestNumber)
  info(`Finished creating pull request ${url} for Jira epic ${epic.key}`)

  const pullRequest = await getPullRequest(repo.name, pullRequestNumber)
  if (isNil(pullRequest)) {
    // This should never happen, but it makes Typescript happy.
    throw new Error(
      `Could not fetch the epic pull request we just created (${repo.name}#${pullRequestNumber})`
    )
  }

  return pullRequest
}
