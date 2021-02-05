import * as Github from '@sr-services/Github'
import { mockGithubPullRequestReviewResponse } from '@sr-tests/Mocks'
import { approvePullRequest } from '@sr-triggers/approvePullRequest'

jest.mock('@sr-services/Github', () => ({
  reviewPullRequest: jest.fn(),
}))

const email = 'user@example.com'
const repoName = 'actions'
const prNumber = 123

describe('approvePullRequest', () => {
  let reviewPullRequest: jest.SpyInstance

  beforeEach(() => {
    reviewPullRequest = jest
      .spyOn(Github, 'reviewPullRequest')
      .mockReturnValue(Promise.resolve(mockGithubPullRequestReviewResponse))
  })

  afterEach(() => {
    reviewPullRequest.mockRestore()
  })

  it('calls the review service', async () => {
    await approvePullRequest(email, `${repoName}#${prNumber}`)
    expect(reviewPullRequest).toHaveBeenCalledWith(
      repoName,
      prNumber,
      'APPROVE',
      ':thumbsup:'
    )
  })

  it('handles badly formed inputs', async () => {
    await approvePullRequest(email, `  ${repoName}   #   ${prNumber}     `)
    expect(reviewPullRequest).toHaveBeenCalledWith(
      repoName,
      prNumber,
      'APPROVE',
      ':thumbsup:'
    )
  })
})
