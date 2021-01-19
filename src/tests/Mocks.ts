import {
  IssuesAddAssigneesResponseData,
  IssuesAddLabelsResponseData,
  IssuesSetLabelsResponseData,
  PullsCreateResponseData,
  PullsGetResponseData,
  PullsRequestReviewersResponseData,
  PullsUpdateResponseData,
  ReposCreateReleaseResponseData,
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import { EventPayloads } from '@octokit/webhooks'
import { TransitionObject } from 'jira-client'

import { Credentials, Repository } from '@sr-services/Credentials'
import { Issue } from '@sr-services/Jira/Issue'
import {
  JiraBoard,
  JiraBoardConfiguration,
  JiraBoardList,
  JiraBoardColumn,
} from '@sr-services/Jira/Project'
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

export const mockGitCommit = {
  author: {
    login: 'dperrett',
  },
  node_id: '12345',
  sha: '0000000000000000000000000000000000000000',
  commit: {
    message: 'Add widget tests',
    tree: {
      sha: '0000000000000000000000000000000000000000',
    },
  },
}

export const mockGithubBranch = ({
  commit: {
    sha: 'branch-sha',
  },
  name: 'my-branch',
  sha: 'branch-sha',
} as unknown) as ReposGetBranchResponseData

export const mockGithubPullRequestCreateResponse = ({
  id: 1234,
  number: 123,
  title: 'Add a Widget',
} as unknown) as PullsCreateResponseData

export const mockGithubPullRequestUpdateResponse = ({
  id: 1234,
  number: 123,
  title: 'Add a Widget',
} as unknown) as PullsUpdateResponseData

export const mockGithubPullRequestPayload = (pullRequestPayload as unknown) as EventPayloads.WebhookPayloadPullRequest

export const mockGithubPullRequest = (mockGithubPullRequestPayload.pull_request as unknown) as PullsGetResponseData

export const mockGithubReleaseName = 'Energetic Eagle'

export const mockGithubRelease = ({
  name: `v2021-01-12-0426 (${mockGithubReleaseName})`,
  tag_name: 'v2021-01-12-0426',
} as unknown) as ReposCreateReleaseResponseData

export const mockGithubRepository = (repository as unknown) as ReposGetResponseData

export const mockIssuesAddAssigneesResponseData = {
  id: 1234,
} as IssuesAddAssigneesResponseData

export const mockIssuesAddLabelsResponseData = [
  { name: 'my-label' },
] as IssuesAddLabelsResponseData

export const mockIssuesSetLabelsResponseData = [
  { name: 'my-label' },
] as IssuesSetLabelsResponseData

export const mockPullsRequestReviewersResponseData = {
  id: 1234,
} as PullsRequestReviewersResponseData

export const mockJiraBoard = {
  id: 123,
  location: {
    projectId: 10003,
  },
} as JiraBoard

export const mockJiraBoardColumn = {
  name: 'Ready for review',
} as JiraBoardColumn

export const mockJiraBoardConfiguration = {
  columnConfig: {
    columns: [mockJiraBoardColumn],
  },
  id: 456,
  name: 'Octokit Board',
} as JiraBoardConfiguration

export const mockJiraBoardList = {
  values: [mockJiraBoard],
} as JiraBoardList

export const mockJiraIssue = issue as Issue

export const mockJiraTransitions = transitions as TransitionObject[]

export const mockJiraPullRequests = pullRequests

export const mockJiraRelease = {
  id: '102030',
  description: 'See https://github.com/octokit/webhooks/pull/1',
  name: mockGithubRelease.name,
  released: true,
}

export const mockRepository = {
  leads: [{ github_username: 'dhh' }],
  reviewers: [{ github_username: 'wycats' }],
  status: 'ok',
} as Repository
