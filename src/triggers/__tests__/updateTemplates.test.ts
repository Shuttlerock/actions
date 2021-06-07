import { TemplateUpdateBranchName } from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import { githubWriteToken } from '@sr-services/Inputs'
import * as Slack from '@sr-services/Slack'
import {
  mockCredentials,
  mockGithubBranch,
  mockGithubCompareCommits,
  mockGithubPullRequest,
  mockGithubRepository,
  mockRepository,
} from '@sr-tests/Mocks'
import { updateTemplates } from '@sr-triggers/updateTemplates'

jest.mock('@sr-services/Github', () => ({
  assignOwners: jest.fn(),
  assignReviewers: jest.fn(),
  compareCommits: jest.fn(),
  createBranch: jest.fn(),
  createPullRequest: jest.fn(),
  deleteBranch: jest.fn(),
  getBranch: jest.fn(),
  getRepository: jest.fn(),
  pullRequestUrl: (repo: string, number: number) =>
    `https://github.com/octokit/${repo}/pull/${number}`,
}))

jest.mock('@sr-services/Slack', () => ({
  negativeEmoji: () => ':sad:',
  positiveEmoji: () => ':smile:',
  reportError: jest.fn(),
  reportInfo: jest.fn(),
  sendUserMessage: jest.fn(),
}))

jest.mock('@sr-services/Credentials', () => ({
  fetchCredentials: jest.fn(),
  fetchRepository: jest.fn(),
}))

describe('updateTemplates', () => {
  let assignOwnersSpy: jest.SpyInstance
  let assignReviewersSpy: jest.SpyInstance
  let compareCommitsSpy: jest.SpyInstance
  let createBranchSpy: jest.SpyInstance
  let createPullRequestSpy: jest.SpyInstance
  let fetchCredentialsSpy: jest.SpyInstance
  let fetchRepositorySpy: jest.SpyInstance
  let getBranchSpy: jest.SpyInstance
  let getRepositorySpy: jest.SpyInstance
  let reportErrorSpy: jest.SpyInstance
  let reportInfoSpy: jest.SpyInstance
  let sendUserMessageSpy: jest.SpyInstance

  beforeEach(() => {
    assignOwnersSpy = jest.spyOn(Github, 'assignOwners')
    assignReviewersSpy = jest.spyOn(Github, 'assignReviewers')
    compareCommitsSpy = jest
      .spyOn(Github, 'compareCommits')
      .mockReturnValue(Promise.resolve(mockGithubCompareCommits))
    createBranchSpy = jest.spyOn(Github, 'createBranch')
    createPullRequestSpy = jest
      .spyOn(Github, 'createPullRequest')
      .mockReturnValue(
        Promise.resolve({ ...mockGithubPullRequest, assignees: [] })
      )
    fetchCredentialsSpy = jest
      .spyOn(Credentials, 'fetchCredentials')
      .mockReturnValue(Promise.resolve(mockCredentials))
    fetchRepositorySpy = jest
      .spyOn(Credentials, 'fetchRepository')
      .mockReturnValue(Promise.resolve(mockRepository))
    getBranchSpy = jest
      .spyOn(Github, 'getBranch')
      .mockReturnValueOnce(Promise.resolve(mockGithubBranch)) // First call to get the develop branch.
      .mockReturnValueOnce(Promise.resolve(undefined)) // Second call to check that no PR branch exists.
      .mockReturnValueOnce(Promise.resolve(mockGithubBranch)) // Third call after we create the PR branch.
    getRepositorySpy = jest
      .spyOn(Github, 'getRepository')
      .mockReturnValue(Promise.resolve(mockGithubRepository))
    reportErrorSpy = jest.spyOn(Slack, 'reportError')
    reportInfoSpy = jest.spyOn(Slack, 'reportInfo')
    sendUserMessageSpy = jest
      .spyOn(Slack, 'sendUserMessage')
      .mockReturnValue(Promise.resolve())
  })

  afterEach(() => {
    assignOwnersSpy.mockRestore()
    assignReviewersSpy.mockRestore()
    compareCommitsSpy.mockRestore()
    createBranchSpy.mockRestore()
    createPullRequestSpy.mockRestore()
    fetchCredentialsSpy.mockRestore()
    fetchRepositorySpy.mockRestore()
    getBranchSpy.mockRestore()
    getRepositorySpy.mockRestore()
    reportErrorSpy.mockRestore()
    reportInfoSpy.mockRestore()
    sendUserMessageSpy.mockRestore()
  })

  it('creates a pull request', async () => {
    await updateTemplates(mockCredentials.email, mockGithubRepository.name)
    expect(createPullRequestSpy).toHaveBeenCalledWith(
      mockGithubRepository.name,
      mockGithubRepository.default_branch,
      TemplateUpdateBranchName,
      '[devops] Update repository configuration',
      'Update repository configuration to the latest defaults.',
      githubWriteToken(),
      { draft: false }
    )
  })

  it('assigns an owner', async () => {
    await updateTemplates(mockCredentials.email, mockGithubRepository.name)
    expect(assignOwnersSpy).toHaveBeenCalledWith(
      mockGithubRepository.name,
      mockGithubPullRequest.number,
      [mockCredentials.github_username]
    )
  })

  it('assigns reviewers', async () => {
    await updateTemplates(mockCredentials.email, mockGithubRepository.name)
    expect(assignReviewersSpy).toHaveBeenCalledWith(
      mockGithubRepository.name,
      mockGithubPullRequest.number,
      [mockRepository.reviewers[0].github_username]
    )
  })

  it('reports success to the user in Slack', async () => {
    await updateTemplates(mockCredentials.email, mockGithubRepository.name)
    expect(reportInfoSpy).toHaveBeenCalledWith(
      mockCredentials.slack_id,
      "Here's your template update PR: *<https://github.com/octokit/webhooks/pull/123|webhooks#123>*"
    )
  })
})
