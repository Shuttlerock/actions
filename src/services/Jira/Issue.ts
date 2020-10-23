import { TransitionObject } from 'jira-client'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { jiraEmail, jiraHost, jiraToken } from '@sr-services/Inputs'
import { client } from '@sr-services/Jira/Client'

interface User {
  accountId: string
  displayName?: string
  emailAddress: string
}

export interface Issue {
  fields: {
    assignee?: User
    description: string
    issuetype: {
      name: string
      subtask: boolean
    }
    subtasks: Issue[]
    summary: string
    status: {
      name: string
    }
    // Added by us.
    repository?: string
  }
  id: string
  key: string
  names: {
    [name: string]: string
  }
  subtask?: boolean
}

interface GithubPullRequest {
  id: string
  status: 'DECLINED' | 'OPEN'
}

interface GithubDetail {
  pullRequests: GithubPullRequest[]
}

interface GithubDetails {
  detail: GithubDetail[]
}

// Jira statuses.
export const JiraStatusInDevelopment = 'In development'
export const JiraStatusTechReview = 'Tech review'
export const JiraStatusValidated = 'Validated'

/**
 * Fetches the issue with the given key from Jira.
 *
 * @param {string} key The key of the Jira issue (eg. 'STUDIO-236').
 *
 * @returns {Issue} The issue data.
 */
export const getIssue = async (key: string): Promise<Issue | undefined> => {
  try {
    const issue = (await client.findIssue(key, 'names')) as Issue

    // Find the repository, and include it explicitly. This is a bit ugly due to the way
    // Jira includes custom fields.
    const fieldName = Object.keys(issue.names).find(
      name => issue.names[name] === 'Repository'
    )
    if (fieldName) {
      issue.fields.repository = ((issue.fields as unknown) as {
        [customField: string]: { value: string }
      })[fieldName]?.value
    }

    return issue
  } catch (err) {
    if (err.statusCode === 404) {
      return undefined
    }

    throw err
  }
}

/**
 * Fetches the numbers of the pull requests attached to this issue. Note that
 * this is a **PRIVATE API**, and may break in the future.
 *
 * @param {string} issueId The ID of the Jira issue (eg. '10910').
 *
 * @returns {number[]} The PR numbers.
 */
export const getIssuePullRequestNumbers = async (
  issueId: string
): Promise<number[]> => {
  const host = `https://${jiraEmail()}:${jiraToken()}@${jiraHost()}/`
  const url = `${host}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=branch`
  const response = await fetch(url)
  const data = (await response.json()) as GithubDetails
  const ids = data.detail
    .map((detail: GithubDetail) =>
      detail.pullRequests
        .filter((pr: GithubPullRequest) => pr.status === 'OPEN')
        .map((pr: GithubPullRequest) => pr.id)
    )
    .flat()
    .map((id: string) => parseInt(id.replace(/[^\d]/, ''), 10))

  return ids
}

/**
 * Transitions the given issue to the given status.
 *
 * @param {string} issueId The issue to transition.
 * @param {string} status  The status to transition to.
 */
export const setIssueStatus = async (
  issueId: string,
  status: string
): Promise<void> => {
  const { transitions } = await client.listTransitions(issueId)
  const transition = transitions.find(
    (trans: TransitionObject) => trans.name === status
  )
  if (isNil(transition)) {
    throw new Error(
      `Cannot set status of issue ${issueId} - status '${status}' could not be found`
    )
  }

  await client.transitionIssue(issueId, { transition })
}
