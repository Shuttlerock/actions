import { Credentials } from '@sr-services/Credentials'
import { Issue } from '@sr-services/Jira/Issue'
import issue from '@sr-tests/fixtures/jira-issue.json'
import pullRequests from '@sr-tests/fixtures/jira-pull-requests.json'

export const mockCredentials = {
  github_token: 'my-github-token',
  github_username: 'my-github-username',
  leads: [],
  reviews: [],
  slack_id: 'my-slack-id',
  status: 'ok',
} as Credentials

export const mockForbiddenCredentials = {
  ...mockCredentials,
  status: 'forbidden',
} as Credentials

export const mockJiraIssue = issue as Issue

export const mockJiraPullRequests = pullRequests
