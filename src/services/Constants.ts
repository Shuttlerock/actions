import { getInput } from '@actions/core'

// Token with write access to Github - set in organization secrets.
export const GithubWriteToken = getInput('write-token', { required: true })

// The email address to use when connecting to the Jira API.
export const JiraEmail = getInput('jira-email', { required: true })

// The host to use when connecting to the Jira API.
export const JiraHost = getInput('jira-host', { required: true })

// The API token to use when connecting to the Jira API.
export const JiraToken = getInput('jira-token', { required: true })

// The Github organization name.
export const OrganizationName = getInput('organization-name', {
  required: true,
})

// The host to use when connecting to the Jira API.
export const UserApiPrefix = getInput('user-api-prefix', { required: true })
