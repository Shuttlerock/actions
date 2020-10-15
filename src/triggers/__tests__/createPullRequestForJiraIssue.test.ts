import { JiraHost } from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import * as Jira from '@sr-services/Jira'
import * as Slack from '@sr-services/Slack'
import {
  mockCredentials,
  mockGithubBranch,
  mockGithubPullRequest,
  mockGithubRepository,
  mockIssuesAddAssigneesResponseData,
  mockIssuesAddLabelsResponseData,
  mockJiraIssue,
} from '@sr-tests/Mocks'
import { createPullRequestForJiraIssue } from '@sr-triggers/createPullRequestForJiraIssue'

jest.mock('@sr-services/Jira', () => ({
  getIssue: jest.fn(),
  getIssuePullRequestNumbers: jest.fn(),
}))
jest.mock('@sr-services/Slack', () => ({ sendUserMessage: jest.fn() }))
jest.mock('@sr-services/Github', () => ({
  addLabels: jest.fn(),
  assignOwners: jest.fn(),
  createPullRequest: jest.fn(),
  getBranch: jest.fn(),
  getRepository: jest.fn(),
}))

const email = 'user@example.com'
const issueKey = 'ISSUE-236'

describe('createPullRequestForJiraIssue', () => {
  let credentialsSpy: jest.SpyInstance
  let githubAddLabelsSpy: jest.SpyInstance
  let githubAssignOwnersSpy: jest.SpyInstance
  let githubCreatePullRequestSpy: jest.SpyInstance
  let githubGetBranchSpy: jest.SpyInstance
  let jiraIssueSpy: jest.SpyInstance
  let jiraPrsSpy: jest.SpyInstance
  let repoSpy: jest.SpyInstance
  let slackSpy: jest.SpyInstance

  beforeEach(() => {
    credentialsSpy = jest
      .spyOn(Credentials, 'getCredentialsByEmail')
      .mockImplementation((_email: string) => Promise.resolve(mockCredentials))
    githubAddLabelsSpy = jest
      .spyOn(Github, 'addLabels')
      .mockImplementation(
        (_repo: Github.Repository, _number: number, _labels: string[]) =>
          Promise.resolve(mockIssuesAddLabelsResponseData)
      )
    githubAssignOwnersSpy = jest
      .spyOn(Github, 'assignOwners')
      .mockImplementation(
        (_repo: Github.Repository, _number: number, _owners: string[]) =>
          Promise.resolve(mockIssuesAddAssigneesResponseData)
      )
    githubCreatePullRequestSpy = jest
      .spyOn(Github, 'createPullRequest')
      .mockImplementation(
        (
          _repo: Github.Repository,
          _base: Github.Branch,
          _head: Github.Branch,
          _title: string,
          _body: string,
          _token: string
        ) => Promise.resolve(mockGithubPullRequest)
      )
    githubGetBranchSpy = jest
      .spyOn(Github, 'getBranch')
      .mockImplementation((_repo: Github.Repository, _branch: Github.Branch) =>
        Promise.resolve(mockGithubBranch)
      )
    jiraIssueSpy = jest
      .spyOn(Jira, 'getIssue')
      .mockImplementation((_issueKey: string) => Promise.resolve(mockJiraIssue))
    jiraPrsSpy = jest
      .spyOn(Jira, 'getIssuePullRequestNumbers')
      .mockImplementation((_issueId: string) => Promise.resolve([]))
    repoSpy = jest
      .spyOn(Github, 'getRepository')
      .mockImplementation((_name: string) =>
        Promise.resolve(mockGithubRepository)
      )
    slackSpy = jest
      .spyOn(Slack, 'sendUserMessage')
      .mockImplementation((_userId: string, _message: string) =>
        Promise.resolve()
      )
  })

  afterEach(() => {
    credentialsSpy.mockRestore()
    githubAddLabelsSpy.mockRestore()
    githubAssignOwnersSpy.mockRestore()
    githubCreatePullRequestSpy.mockRestore()
    githubGetBranchSpy.mockRestore()
    jiraIssueSpy.mockRestore()
    jiraPrsSpy.mockRestore()
    repoSpy.mockRestore()
    slackSpy.mockRestore()
  })

  it('sends an error message if no user is assigned to the issue', async () => {
    const noAssignee = {
      ...mockJiraIssue,
      fields: { ...mockJiraIssue.fields, assignee: undefined },
    }
    jiraIssueSpy.mockImplementation((_key: string) =>
      Promise.resolve(noAssignee)
    )
    await createPullRequestForJiraIssue(email, issueKey)
    const message = `Issue <https://${JiraHost}/browse/${issueKey}|${issueKey}> is not assigned to anyone, so no pull request was created`
    expect(slackSpy).toHaveBeenCalledWith(mockCredentials.slack_id, message)
  })

  it("doesn't make a pull request if the issue has sub-tasks", async () => {
    const noSubtasks = {
      ...mockJiraIssue,
      fields: { ...mockJiraIssue.fields, subtasks: [{ id: 'ISSUE-237' }] },
    }
    jiraIssueSpy.mockImplementation((_key: string) =>
      Promise.resolve(noSubtasks)
    )
    await createPullRequestForJiraIssue(email, issueKey)
    const message = `Issue <https://${JiraHost}/browse/${issueKey}|${issueKey}> has subtasks, so no pull request was created`
    expect(slackSpy).toHaveBeenCalledWith(mockCredentials.slack_id, message)
  })

  it('sends an error message if no repository is set for the issue', async () => {
    const noRepository = {
      ...mockJiraIssue,
      fields: { ...mockJiraIssue.fields, repository: undefined },
    }
    jiraIssueSpy.mockImplementation((_key: string) =>
      Promise.resolve(noRepository)
    )
    await createPullRequestForJiraIssue(email, issueKey)
    const message = `No repository is set for issue <https://${JiraHost}/browse/${issueKey}|${issueKey}>, so no pull request was created`
    expect(slackSpy).toHaveBeenCalledWith(mockCredentials.slack_id, message)
  })

  it('returns an existing PR if there is one', async () => {
    jiraPrsSpy.mockImplementation((_issueId: string) => Promise.resolve([123]))
    await createPullRequestForJiraIssue(email, issueKey)
    const message =
      "Here's your pull request: https://github.com/octokit/webhooks/pull/123\nPlease prefix your commits with `[#123] [ISSUE-236]`"
    expect(slackSpy).toHaveBeenCalledWith(mockCredentials.slack_id, message)
    expect(githubCreatePullRequestSpy.mock.calls.length).toBe(0)
  })

  it('creates a new PR', async () => {
    await createPullRequestForJiraIssue(email, issueKey)
    const message =
      "Here's your pull request: https://github.com/octokit/webhooks/pull/123\nPlease prefix your commits with `[#123] [ISSUE-236]`"
    expect(slackSpy).toHaveBeenCalledWith(mockCredentials.slack_id, message)
    expect(githubCreatePullRequestSpy).toHaveBeenCalled()
  })
})
