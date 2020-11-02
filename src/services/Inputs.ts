import { getInput } from '@actions/core'

// The host to use when connecting to the Jira API.
export const credentialsApiPrefix = (): string =>
  getInput('credentials-api-prefix', { required: true })

// The host to use when connecting to the Jira API.
export const credentialsApiSecret = (): string =>
  getInput('credentials-api-secret', { required: true })

// The API token to use when connecting to the CircleCI API.
export const circleciToken = (): string =>
  getInput('circleci-token', { required: true })

// Token with read access to Github - provided by Github.
export const githubReadToken = (): string =>
  getInput('repo-token', { required: true })

// Token with write access to Github - set in organization secrets.
export const githubWriteToken = (): string =>
  getInput('write-token', { required: true })

// The email address to use when connecting to the Jira API.
export const jiraEmail = (): string =>
  getInput('jira-email', { required: true })

// The host to use when connecting to the Jira API.
export const jiraHost = (): string => getInput('jira-host', { required: true })

// The API token to use when connecting to the Jira API.
export const jiraToken = (): string =>
  getInput('jira-token', { required: true })

// The Github organization name.
export const organizationName = (): string =>
  getInput('organization-name', { required: true })

// ID of the Slack channel to post errors to, if we don't know where else to send them.
export const slackErrorChannelId = (): string =>
  getInput('slack-error-channel-id', { required: true })

// Token with write access to Slack.
export const slackToken = (): string =>
  getInput('slack-token', { required: true })
