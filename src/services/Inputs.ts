import { getInput } from '@actions/core'

// The base URL to use when connecting to the internal credentials API.
export const credentialsApiPrefix = (): string =>
  getInput('credentials-api-prefix', { required: false })

// The secret to use when connecting to the internal credentials API.
export const credentialsApiSecret = (): string =>
  getInput('credentials-api-secret', { required: false })

// Token with read access to Github - provided by Github.
export const githubReadToken = (): string =>
  getInput('repo-token', { required: false })

// Token with write access to Github - set in organization secrets.
export const githubWriteToken = (): string =>
  getInput('write-token', { required: false })

// The email address to use when connecting to the Jira API.
export const jiraEmail = (): string =>
  getInput('jira-email', { required: false })

// The host to use when connecting to the Jira API.
export const jiraHost = (): string => getInput('jira-host', { required: false })

// The API token to use when connecting to the Jira API.
export const jiraToken = (): string =>
  getInput('jira-token', { required: false })

// The Github organization name.
export const organizationName = (): string =>
  getInput('organization-name', { required: false })

// ID of the Slack channel to post errors to, if we don't know where else to send them.
export const slackErrorChannelId = (): string =>
  getInput('slack-error-channel-id', { required: false })

// Token with write access to Slack.
export const slackToken = (): string =>
  getInput('slack-token', { required: false })
