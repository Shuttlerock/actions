import { EpicLabel, InProgressLabel } from '@sr-services/Constants'
import * as Branch from '@sr-services/Github/Branch'
import { createEpicPullRequest } from '@sr-services/Github/Epic'
import * as Git from '@sr-services/Github/Git'
import * as Label from '@sr-services/Github/Label'
import * as PullRequest from '@sr-services/Github/PullRequest'
import * as Repository from '@sr-services/Github/Repository'
import * as Jira from '@sr-services/Jira'
import {
  mockGithubBranch,
  mockGithubPullRequest,
  mockGithubPullRequestCreateResponse,
  mockGithubRepository,
  mockIssuesAddLabelsResponseData,
  mockJiraIssue,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  getEpic: jest.fn(),
  getIssue: jest.fn(),
  getIssuePullRequestNumbers: jest.fn(),
  issueUrl: (key: string) => `https://example.atlassian.net/browse/${key}`,
}))
jest.mock('@sr-services/Slack', () => ({ sendUserMessage: jest.fn() }))
jest.mock('@sr-services/Github/Branch', () => ({ getBranch: jest.fn() }))
jest.mock('@sr-services/Github/Label', () => ({ addLabels: jest.fn() }))
jest.mock('@sr-services/Github/PullRequest', () => ({
  assignOwners: jest.fn(),
  createPullRequest: jest.fn(),
  getPullRequest: jest.fn(),
  pullRequestUrl: (repo: string, number: number) =>
    `https://github.com/octokit/${repo}/pull/${number}`,
}))
jest.mock('@sr-services/Github/Repository', () => ({
  getRepository: jest.fn(),
}))

const repo = 'webhooks'

describe('Epic', () => {
  describe('createEpicPullRequest', () => {
    let githubAddLabelsSpy: jest.SpyInstance
    let githubCreatePullRequestSpy: jest.SpyInstance
    let githubGetPullRequestSpy: jest.SpyInstance
    let githubGetBranchSpy: jest.SpyInstance
    let jiraPrsSpy: jest.SpyInstance
    let repoSpy: jest.SpyInstance

    beforeEach(() => {
      githubAddLabelsSpy = jest
        .spyOn(Label, 'addLabels')
        .mockImplementation(
          (_repo: Git.Repository, _number: number, _labels: string[]) =>
            Promise.resolve(mockIssuesAddLabelsResponseData)
        )
      githubCreatePullRequestSpy = jest
        .spyOn(PullRequest, 'createPullRequest')
        .mockImplementation(
          (
            _repo: Git.Repository,
            _base: Git.Branch,
            _head: Git.Branch,
            _title: string,
            _body: string,
            _token: string
          ) => Promise.resolve(mockGithubPullRequestCreateResponse)
        )
      githubGetPullRequestSpy = jest
        .spyOn(PullRequest, 'getPullRequest')
        .mockImplementation((_repo: Git.Repository, _number: number) =>
          Promise.resolve(mockGithubPullRequest)
        )
      githubGetBranchSpy = jest
        .spyOn(Branch, 'getBranch')
        .mockImplementation((_repo: Git.Repository, _branch: Git.Branch) =>
          Promise.resolve(mockGithubBranch)
        )
      jiraPrsSpy = jest
        .spyOn(Jira, 'getIssuePullRequestNumbers')
        .mockImplementation((_issueId: string, _repo: Git.Repository) =>
          Promise.resolve([])
        )
      repoSpy = jest
        .spyOn(Repository, 'getRepository')
        .mockImplementation((_name: string) =>
          Promise.resolve(mockGithubRepository)
        )
    })

    afterEach(() => {
      githubAddLabelsSpy.mockRestore()
      githubCreatePullRequestSpy.mockRestore()
      githubGetPullRequestSpy.mockRestore()
      githubGetBranchSpy.mockRestore()
      jiraPrsSpy.mockRestore()
      repoSpy.mockRestore()
    })

    it('returns an existing PR if there is one', async () => {
      jiraPrsSpy.mockImplementation((_issueId: string) =>
        Promise.resolve([123])
      )
      const pr = await createEpicPullRequest(mockJiraIssue, repo)
      expect(pr.number).toEqual(123)
      expect(githubCreatePullRequestSpy).toHaveBeenCalledTimes(0)
    })

    it('creates a new PR', async () => {
      const pr = await createEpicPullRequest(mockJiraIssue, repo)
      expect(pr.number).toEqual(123)
      expect(githubCreatePullRequestSpy).toHaveBeenCalledWith(
        'webhooks',
        'develop',
        'sr-devops/issue-236-create-a-release-pr',
        '[ISSUE-236] [Epic] Create a release PR',
        expect.anything(),
        expect.anything()
      )
      expect(githubAddLabelsSpy).toHaveBeenCalledWith(repo, 123, [
        EpicLabel,
        InProgressLabel,
      ])
    })
  })
})
