import { error, info } from '@actions/core'
import { TransitionObject } from 'jira-client'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { Repository } from '@sr-services/Github/Git'
import { jiraHost, organizationName } from '@sr-services/Inputs'
import { apiPrefix, client } from '@sr-services/Jira/Client'

interface User {
  accountId: string
  displayName?: string
  emailAddress: string
}

type FieldNames = { [name: string]: string }

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
    project?: {
      id: string
      key: string
    }
    subtasks?: Issue[]
    summary: string
    status: {
      name: string
    }
    // Added by us.
    repository?: string
    storyPointEstimate?: number
  }
  id: string
  key: string
  names?: FieldNames
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

interface IssueSearchResults {
  issues: Issue[]
  maxResults: number
  startAt: number
  total: number
}

// Jira statuses.
export const JiraStatusDone = 'Done'
export const JiraStatusHasIssues = 'Has issues'
export const JiraStatusInDevelopment = 'In development'
export const JiraStatusInProgress = 'In progress' // Alternative to 'In development' in some boards.
export const JiraStatusReadyForPlanning = 'Ready for planning'
export const JiraStatusTechnicalPlanning = 'Technical Planning'
export const JiraStatusTechReview = 'Tech review'
export const JiraStatusValidated = 'Validated'

// Jira issue types.
export const JiraIssueTypeEpic = 'Epic'

// Jira labels.
export const JiraLabelSkipPR = 'Skip_PR'

// Jira issue field names.
export const JiraFieldRepository = 'Repository'
export const JiraFieldStoryPointEstimate = 'Story point estimate'

/**
 * Returns the field ID for the given human-readable field name.
 *
 * @param {Issue}  issue     The issue whose fields we want to search.
 * @param {string} fieldName The human-readable field name to search for.
 *
 * @returns {string} The field ID.
 */
const idForFieldName = (
  issue: Issue,
  fieldName: string
): string | undefined => {
  const names = issue.names || {}
  return Object.keys(names).find(id => names[id] === fieldName)
}

/**
 * Populates some fields explicitly that are buried away as 'custom fields' with ID
 * identifiers mapped to the 'names' list.
 *
 * @param {Issue} issue The issue whose data we want to populate.
 *
 * @returns {Issue} The issues, with fields populated.
 */
const populateExplicitFields = (issue: Issue) => {
  let fieldId

  // Find the repository, and include it explicitly. This is a bit ugly due to the way
  // Jira includes custom fields.
  fieldId = idForFieldName(issue, JiraFieldRepository)
  if (fieldId) {
    Object.assign(issue.fields, {
      repository: ((issue.fields as unknown) as {
        [customField: string]: { value: string }
      })[fieldId]?.value,
    })
  }

  // Find the story points, and include it explicitly. This is a bit ugly due to the way
  // Jira includes custom fields.
  fieldId = idForFieldName(issue, JiraFieldStoryPointEstimate)
  if (fieldId) {
    Object.assign(issue.fields, {
      storyPointEstimate: ((issue.fields as unknown) as {
        [customField: string]: number
      })[fieldId],
    })
  }

  return issue
}

/**
 * Fetches all direct children of the issue with the given key from Jira.
 *
 * @param {string} key The key of the Jira issue (eg. 'ISSUE-236').
 *
 * @returns {Issue[]} The direct child issues.
 */
export const getChildIssues = async (key: string): Promise<Issue[]> => {
  const { errorMessages, issues, names } = (await client.searchJira(
    `parent=${key}`,
    {
      maxResults: 100,
      expand: ['names'],
    }
  )) as { errorMessages?: string[]; issues?: Issue[]; names: FieldNames }

  if (!isNil(errorMessages)) {
    errorMessages.forEach(msg => error(msg))
    return []
  }
  if (isNil(issues) || issues.length === 0) {
    return []
  }

  return issues.map((issue: Issue) => {
    Object.assign(issue, { names })
    return populateExplicitFields(issue)
  })
}

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

    return populateExplicitFields(issue)
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
  const url = `${apiPrefix()}/rest/dev-status/latest/issue/detail?issueId=${issueId}&applicationType=GitHub&dataType=branch`
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
 * Returns true if the issue is on the board with the given ID, false otherwise.
 *
 * @param {string} boardId The ID of the Jira board (eg. '4').
 * @param {string} issueId The ID of the Jira issue (eg. '10910').
 *
 * @returns {boolean} True if the issue is on the board.
 */
export const isIssueOnBoard = async (
  boardId: number,
  issueId: string
): Promise<boolean> => {
  const url = `${apiPrefix()}/rest/agile/1.0/board/${boardId}/backlog?jql=id%3D${issueId}`
  const response = await fetch(url)
  const data = (await response.json()) as IssueSearchResults

  // If it's NOT in the backlog, then it's on the board.
  return data.total === 0
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
 * Moves the issue to the board with the given ID.
 *
 * @see https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/#api-agile-1-0-board-boardid-issue-post
 *
 * @param {string} boardId The ID of the Jira board (eg. '4').
 * @param {string} issueId The ID of the Jira issue (eg. '10910').
 *
 * @returns {number} The status code of the response.
 */
export const moveIssueToBoard = async (
  boardId: number,
  issueId: string
): Promise<number> => {
  info(`Moving issue ${issueId} to the board ${boardId}...`)
  const url = `${apiPrefix()}/rest/agile/1.0/board/${boardId}/issue`
  const options = {
    body: JSON.stringify({ issues: [issueId] }),
    headers: { 'Content-Type': 'application/json' },
    method: 'post',
  }
  // This API method just returns 204 (No Content).
  const response = await fetch(url, options)
  info(
    `Finished moving issue ${issueId} to the board ${boardId} (response status ${response.status})`
  )
  return response.status
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

/**
 * Sets the 'fixVersions' of the issue with the given ID.
 *
 * @param {string} issueId     The issue whose version we want to set.
 * @param {string} versionId The name of the version to add the issue to.
 */
export const setVersion = async (
  issueId: string,
  versionId: string
): Promise<void> => {
  const data = {
    fields: {
      fixVersions: [{ id: versionId }],
    },
  }
  await client.updateIssue(issueId, data)
}

/**
 * Sets the custom field with the given name to the given value.
 *
 * @param {Issue}           issue     The issue to update.
 * @param {string}          fieldName The name of the custom field to update.
 * @param {string | number} value The value to set the field to.
 */
export const updateCustomField = async (
  issue: Issue,
  fieldName: string,
  value: string | number
): Promise<void> => {
  const fieldId = idForFieldName(issue, fieldName)
  if (isNil(fieldId)) {
    throw new Error(
      `Cannot find ID of field '${fieldName}' in issue ${issue.key}`
    )
  }

  const data = {
    fields: {
      [fieldId]: value,
    },
  }
  await client.updateIssue(issue.id, data)
}
