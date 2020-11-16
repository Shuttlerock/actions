import { TransitionObject } from 'jira-client'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { Repository } from '@sr-services/Github/Git'
import {
  jiraEmail,
  jiraHost,
  jiraToken,
  organizationName,
} from '@sr-services/Inputs'
import { client } from '@sr-services/Jira/Client'

interface User {
  accountId: string
  displayName?: string
  emailAddress: string
}

export interface Issue {
  fields: {
    assignee?: User
    description?: string
    issuetype: {
      name: string
      subtask: boolean
    }
    labels?: string[]
    parent?: Issue
    subtasks?: Issue[]
    summary: string
    status: {
      name: string
    }
    // Added by us.
    repository?: string
  }
  id: string
  key: string
  names?: {
    [name: string]: string
  }
  subtask?: boolean
}

interface GithubPullRequest {
  id: string
  status: 'DECLINED' | 'OPEN'
  url: string
}

interface GithubDetail {
  pullRequests: GithubPullRequest[]
}

interface GithubDetails {
  detail: GithubDetail[]
}

// Jira statuses.
export const JiraStatusHasIssues = 'Has issues'
export const JiraStatusInDevelopment = 'In development'
export const JiraStatusTechReview = 'Tech review'
export const JiraStatusValidated = 'Validated'

// Jira issue types.
export const JiraIssueTypeEpic = 'Epic'

// Jira labels.
export const JiraLabelSkipPR = 'Skip_PR'

/**
 * Fetches the issue with the given key from Jira.
 *
 * @param {string} key The key of the Jira issue (eg. 'ISSUE-236').
 *
 * @returns {Issue} The issue data.
 */
export const getIssue = async (key: string): Promise<Issue | undefined> => {
  try {
    const issue = (await client.findIssue(key, 'names')) as Issue

    // Find the repository, and include it explicitly. This is a bit ugly due to the way
    // Jira includes custom fields.
    const names = issue.names || {}
    const fieldName = Object.keys(names).find(
      name => names[name] === 'Repository'
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
 * Fetches the parent epic (if one exists) of the issue with the given key from Jira.
 *
 * @param {string} key The key of the Jira issue (eg. 'ISSUE-236').
 *
 * @returns {Issue} The epic issue data.
 */
export const getEpic = async (key: string): Promise<Issue | undefined> => {
  const issue = await getIssue(key)
  if (isNil(issue)) {
    return undefined
  }
  if (issue.fields.issuetype.name === JiraIssueTypeEpic) {
    return issue
  }
  if (issue.fields.parent) {
    if (issue.fields.parent.fields.issuetype.name === JiraIssueTypeEpic) {
      return getIssue(issue.fields.parent.key)
    }
    // eslint-disable-next-line no-use-before-define
    return recursiveGetEpic(issue.fields.parent.key)
  }

  return undefined
}
// This is purely separated for ease of testing.
export const recursiveGetEpic = async (
  key: string
): Promise<Issue | undefined> => getEpic(key)

/**
 * Fetches the numbers of the pull requests attached to this issue. Note that
 * this is a **PRIVATE API**, and may break in the future.
 *
 * @param {string}     issueId The ID of the Jira issue (eg. '10910').
 * @param {Repository} repo    The name of the repository we're dealing with.
 *
 * @returns {number[]} The PR numbers.
 */
export const getIssuePullRequestNumbers = async (
  issueId: string,
  repo: Repository
): Promise<number[]> => {
  const host = `https://${jiraEmail()}:${jiraToken()}@${jiraHost()}/`
  const url = `${host}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=branch`
  const response = await fetch(url)
  const data = (await response.json()) as GithubDetails
  const ids = data.detail
    .map((detail: GithubDetail) =>
      detail.pullRequests
        .filter(
          (pr: GithubPullRequest) =>
            pr.url.startsWith(
              `https://github.com/${organizationName()}/${repo}/`
            ) && pr.status === 'OPEN'
        )
        .map((pr: GithubPullRequest) => pr.id)
    )
    .flat()
    .map((id: string) => parseInt(id.replace(/[^\d]/, ''), 10))

  return ids
}

/**
 * Returns the URL of the issue with the given key.
 *
 * @param {string} key The key of the Jira issue (eg. 'ISSUE-236').
 *
 * @returns {string} The URL of the issue.
 */
export const issueUrl = (key: string): string =>
  `https://${jiraHost()}/browse/${key}`

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
