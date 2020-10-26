import {
  IssuesAddAssigneesResponseData,
  IssuesAddLabelsResponseData,
  PullsCreateResponseData,
  PullsGetResponseData,
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import { EventPayloads } from '@octokit/webhooks'
import { TransitionObject } from 'jira-client'

import { Credentials } from '@sr-services/Credentials'
import { Issue } from '@sr-services/Jira/Issue'
import pullRequestPayload from '@sr-tests/fixtures/github-pull-request-payload.json'
import repository from '@sr-tests/fixtures/github-repository.json'
import issue from '@sr-tests/fixtures/jira-issue.json'
import pullRequests from '@sr-tests/fixtures/jira-pull-requests.json'
import transitions from '@sr-tests/fixtures/jira-transitions.json'

export const mockCredentials = {
  email: 'user@example.com',
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

export const mockGithubBranch = ({
  name: 'my-branch',
  sha: 'branch-sha',
} as unknown) as ReposGetBranchResponseData

export const mockGithubPullRequestCreateResponse = ({
  id: 1234,
  number: 123,
} as unknown) as PullsCreateResponseData

export const mockGithubPullRequestPayload = (pullRequestPayload as unknown) as EventPayloads.WebhookPayloadPullRequest

export const mockGithubPullRequest = (mockGithubPullRequestPayload.pull_request as unknown) as PullsGetResponseData

export const mockGithubRepository = (repository as unknown) as ReposGetResponseData

export const mockIssuesAddAssigneesResponseData = {
  id: 1234,
} as IssuesAddAssigneesResponseData

export const mockIssuesAddLabelsResponseData = [
  { name: 'my-label' },
] as IssuesAddLabelsResponseData

export const mockJiraIssue = issue as Issue

export const mockJiraTransitions = transitions as TransitionObject[]

export const mockJiraPullRequests = pullRequests
