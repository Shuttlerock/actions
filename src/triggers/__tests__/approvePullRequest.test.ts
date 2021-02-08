import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import * as Slack from '@sr-services/Slack'
import {
  mockGithubPullRequestReviewResponse,
  mockCredentials,
  mockRepository,
} from '@sr-tests/Mocks'
import { approvePullRequest } from '@sr-triggers/approvePullRequest'

jest.mock('@sr-services/Github', () => ({
  pullRequestUrl: (repo: string, number: number) =>
    `https://github.com/octokit/${repo}/pull/${number}`,
  reviewPullRequest: jest.fn(),
}))

jest.mock('@sr-services/Slack', () => ({
  negativeEmoji: () => ':sad:',
  positiveEmoji: () => ':smile:',
  sendUserMessage: jest.fn(),
}))

const email = 'user@example.com'
const repoName = 'actions'
const prNumber = 123

describe('approvePullRequest', () => {
  let fetchCredentialsSpy: jest.SpyInstance
  let fetchRepositorySpy: jest.SpyInstance
  let reviewPullRequestSpy: jest.SpyInstance
  let sendUserMessageSpy: jest.SpyInstance

  beforeEach(() => {
    fetchCredentialsSpy = jest
      .spyOn(Credentials, 'fetchCredentials')
      .mockReturnValue(Promise.resolve(mockCredentials))
    fetchRepositorySpy = jest
      .spyOn(Credentials, 'fetchRepository')
      .mockImplementation((_name?: string) => Promise.resolve(mockRepository))
    reviewPullRequestSpy = jest
      .spyOn(Github, 'reviewPullRequest')
      .mockReturnValue(Promise.resolve(mockGithubPullRequestReviewResponse))
    sendUserMessageSpy = jest
      .spyOn(Slack, 'sendUserMessage')
      .mockReturnValue(Promise.resolve())
  })

  afterEach(() => {
    fetchCredentialsSpy.mockRestore()
    fetchRepositorySpy.mockRestore()
    reviewPullRequestSpy.mockRestore()
    sendUserMessageSpy.mockRestore()
  })

  it('calls the review service', async () => {
    await approvePullRequest(email, `${repoName}#${prNumber}`)
    expect(reviewPullRequestSpy).toHaveBeenCalledWith(
      repoName,
      prNumber,
      'APPROVE',
      ':thumbsup:'
    )
  })

  it('handles badly formed inputs', async () => {
    await approvePullRequest(email, `  ${repoName}   #   ${prNumber}     `)
    expect(reviewPullRequestSpy).toHaveBeenCalledWith(
      repoName,
      prNumber,
      'APPROVE',
      ':thumbsup:'
    )
  })

  it('sends the user a message after the pull request has been approved', async () => {
    await approvePullRequest(email, `${repoName}#${prNumber}`)
    expect(sendUserMessageSpy).toHaveBeenCalledWith(
      'my-slack-id',
      'The pull request *<https://github.com/octokit/actions/pull/123|actions#123>* has been approved :smile:'
    )
  })

  it("sends the user a message if the repository can't be auto-approved", async () => {
    fetchRepositorySpy.mockImplementation((_name?: string) =>
      Promise.resolve({ ...mockRepository, allow_auto_review: false })
    )
    await approvePullRequest(email, `${repoName}#${prNumber}`)
    expect(reviewPullRequestSpy).toHaveBeenCalledTimes(0)
    expect(sendUserMessageSpy).toHaveBeenCalledWith(
      'my-slack-id',
      'The repository _*actions*_ is not whitelisted for auto-approval :sad:'
    )
  })
})
