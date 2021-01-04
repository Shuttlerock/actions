import * as core from '@actions/core'
import {
  OctokitResponse,
  PullsListResponseData,
  ReposCompareCommitsResponseData,
} from '@octokit/types'

import {
  DevelopBranchName,
  MasterBranchName,
  ReleaseBranchName,
} from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Branch from '@sr-services/Github/Branch'
import { readClient } from '@sr-services/Github/Client'
import * as Git from '@sr-services/Github/Git'
import * as PullRequest from '@sr-services/Github/PullRequest'
import { createReleasePullRequest } from '@sr-services/Github/Release'
import * as Repository from '@sr-services/Github/Repository'
import { githubWriteToken } from '@sr-services/Inputs'
import {
  mockCredentials,
  mockGitCommit,
  mockGithubBranch,
  mockGithubPullRequest,
  mockGithubRepository,
} from '@sr-tests/Mocks'

const email = 'user@example.com'

jest.mock('@sr-services/Github/Branch', () => ({
  deleteBranch: jest.fn(),
  getBranch: jest.fn(),
}))

jest.mock('@sr-services/Credentials', () => ({
  fetchCredentials: jest.fn(),
}))

jest.mock('@sr-services/Github/Git', () => ({
  createGitBranch: jest.fn(),
}))

jest.mock('@sr-services/Github/PullRequest', () => ({
  createPullRequest: jest.fn(),
  getPullRequest: jest.fn(),
  updatePullRequest: jest.fn(),
}))

jest.mock('@sr-services/Github/Repository', () => ({
  compareCommits: jest.fn(),
}))

jest.mock('@sr-services/Slack', () => ({ sendUserMessage: jest.fn() }))

describe('Release', () => {
  describe('createReleasePullRequest', () => {
    let compareCommitsSpy: jest.SpyInstance
    let createGitBranchSpy: jest.SpyInstance
    let createPullRequestSpy: jest.SpyInstance
    let deleteBranchSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance
    let fetchCredentialsSpy: jest.SpyInstance
    let getBranchSpy: jest.SpyInstance
    let getPullRequestSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let listPullsSpy: jest.SpyInstance
    let updatePullRequestSpy: jest.SpyInstance

    beforeEach(() => {
      compareCommitsSpy = jest
        .spyOn(Repository, 'compareCommits')
        .mockReturnValue(
          Promise.resolve(({
            commits: [mockGitCommit],
            total_commits: 1,
          } as unknown) as ReposCompareCommitsResponseData)
        )
      createGitBranchSpy = jest.spyOn(Git, 'createGitBranch')
      createPullRequestSpy = jest.spyOn(PullRequest, 'createPullRequest')
      deleteBranchSpy = jest.spyOn(Branch, 'deleteBranch')
      errorSpy = jest
        .spyOn(core, 'error')
        .mockImplementation((_message: string | Error) => undefined)
      fetchCredentialsSpy = jest
        .spyOn(Credentials, 'fetchCredentials')
        .mockReturnValue(Promise.resolve(mockCredentials))
      getBranchSpy = jest
        .spyOn(Branch, 'getBranch')
        .mockReturnValue(Promise.resolve(mockGithubBranch))
      getPullRequestSpy = jest.spyOn(PullRequest, 'getPullRequest')
      infoSpy = jest
        .spyOn(core, 'info')
        .mockImplementation((_message: string | Error) => undefined)
      listPullsSpy = jest.spyOn(readClient.pulls, 'list').mockReturnValue(
        Promise.resolve(({
          data: [mockGithubPullRequest],
        } as unknown) as OctokitResponse<PullsListResponseData>)
      )
      updatePullRequestSpy = jest.spyOn(PullRequest, 'updatePullRequest')
    })

    afterEach(() => {
      compareCommitsSpy.mockRestore()
      createGitBranchSpy.mockRestore()
      createPullRequestSpy.mockRestore()
      deleteBranchSpy.mockRestore()
      errorSpy.mockRestore()
      fetchCredentialsSpy.mockRestore()
      getBranchSpy.mockRestore()
      getPullRequestSpy.mockRestore()
      infoSpy.mockRestore()
      listPullsSpy.mockRestore()
      updatePullRequestSpy.mockRestore()
    })

    it(`reports an error if the ${DevelopBranchName} branch cannot be found`, async () => {
      getBranchSpy.mockReturnValue(Promise.resolve(undefined))
      await createReleasePullRequest(email, mockGithubRepository)
      const message = `Branch '${DevelopBranchName}' could not be found for repository webhooks - giving up`
      expect(errorSpy).toHaveBeenLastCalledWith(message)
    })

    it(`reports an error if the ${MasterBranchName} branch cannot be found`, async () => {
      getBranchSpy
        .mockReturnValueOnce(Promise.resolve(mockGithubBranch))
        .mockReturnValueOnce(Promise.resolve(undefined))
      await createReleasePullRequest(email, mockGithubRepository)
      const message = `Branch '${MasterBranchName}' could not be found for repository webhooks - giving up`
      expect(errorSpy).toHaveBeenLastCalledWith(message)
    })

    it(`does nothing if the ${MasterBranchName} branch already has the latest release`, async () => {
      const response = Promise.resolve(({
        commits: [],
        total_commits: 0,
      } as unknown) as ReposCompareCommitsResponseData)
      compareCommitsSpy.mockReturnValue(response)
      await createReleasePullRequest(email, mockGithubRepository)
      const message = `Branch '${MasterBranchName}' already contains the latest release - nothing to do`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
    })

    it('returns an existing pull request if one exists', async () => {
      listPullsSpy = jest.spyOn(readClient.pulls, 'list').mockReturnValue(
        Promise.resolve(({
          data: [mockGithubPullRequest],
        } as unknown) as OctokitResponse<PullsListResponseData>)
      )
      await createReleasePullRequest(email, mockGithubRepository)
      const message = `An existing release pull request was found (${mockGithubRepository.name}#${mockGithubPullRequest.number}) - updating the release notes...`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
    })

    it('reports an error if the pull request cannot be created', async () => {
      createPullRequestSpy.mockReturnValue(undefined)
      await createReleasePullRequest(email, mockGithubRepository)
      const message = `An unknown error occurred while creating a release pull request for repository '${mockGithubRepository.name}'`
      expect(errorSpy).toHaveBeenLastCalledWith(message)
    })

    it('creates a release pull request', async () => {
      listPullsSpy = jest.spyOn(readClient.pulls, 'list').mockReturnValue(
        Promise.resolve(({
          data: [],
        } as unknown) as OctokitResponse<PullsListResponseData>)
      )
      await createReleasePullRequest(email, mockGithubRepository)
      const message =
        'No existing release pull request was found - creating it...'
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(createPullRequestSpy).toHaveBeenCalledWith(
        mockGithubRepository.name,
        MasterBranchName,
        ReleaseBranchName,
        expect.stringMatching(/^Release Candidate /), // Pull request title.
        expect.stringMatching(/## Release Candidate /), // Pull request body.
        githubWriteToken()
      )
    })
  })
})
