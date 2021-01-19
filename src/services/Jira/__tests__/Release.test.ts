import * as core from '@actions/core'
import { PullsListCommitsResponseData } from '@octokit/types'
import fetch from 'node-fetch'

import * as PullRequest from '@sr-services/Github/PullRequest'
import { client } from '@sr-services/Jira/Client'
import * as Issue from '@sr-services/Jira/Issue'
import * as Project from '@sr-services/Jira/Project'
import * as Release from '@sr-services/Jira/Release'
import {
  mockGitCommit,
  mockGithubPullRequest,
  mockGithubRelease,
  mockGithubReleaseName,
  mockGithubRepository,
  mockJiraRelease,
} from '@sr-tests/Mocks'

const { Response } = jest.requireActual('node-fetch')

jest.mock('node-fetch', () => jest.fn())

jest.mock('@sr-services/Github/PullRequest', () => ({
  getPullRequest: jest.fn(),
  listPullRequestCommits: jest.fn(),
  pullRequestUrl: jest.fn(),
}))

jest.mock('@sr-services/Jira/Issue', () => ({
  JiraStatusDone: 'done',
  setIssueStatus: jest.fn(),
  setVersion: jest.fn(),
}))

describe('Release', () => {
  describe('createRelease', () => {
    const prName = `${mockGithubRepository.name}#${mockGithubPullRequest.number}`
    let createVersionSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance
    let getProjectSpy: jest.SpyInstance
    let getPullRequestSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let listPullRequestCommitsSpy: jest.SpyInstance
    let pullRequestUrlSpy: jest.SpyInstance
    let setIssueStatusSpy: jest.SpyInstance
    let setVersionSpy: jest.SpyInstance

    const payload = async () =>
      Release.createRelease(
        mockGithubRepository.name,
        mockGithubPullRequest.number,
        mockGithubRelease.tag_name,
        mockGithubReleaseName
      )

    beforeEach(() => {
      // Mock the API call to search for a matching release.
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify({ values: [mockJiraRelease] }))
      )

      const commits = [
        mockGitCommit,
        {
          ...mockGitCommit,
          commit: {
            ...mockGitCommit.commit,
            message:
              '[#456] [ISSUE-123] Make a widget\nAnother line because this broke before',
          },
        },
        {
          ...mockGitCommit,
          commit: {
            ...mockGitCommit.commit,
            message: '[ISSUE-456] Make another widget',
          },
        },
      ]
      createVersionSpy = jest
        .spyOn(client, 'createVersion')
        .mockReturnValue(Promise.resolve(mockJiraRelease))
      errorSpy = jest.spyOn(core, 'error')
      getProjectSpy = jest
        .spyOn(Project, 'getProject')
        .mockReturnValue(Promise.resolve({ id: '101010' }))
      getPullRequestSpy = jest
        .spyOn(PullRequest, 'getPullRequest')
        .mockReturnValue(Promise.resolve(mockGithubPullRequest))
      infoSpy = jest.spyOn(core, 'info')
      listPullRequestCommitsSpy = jest
        .spyOn(PullRequest, 'listPullRequestCommits')
        .mockReturnValue(
          Promise.resolve(commits as PullsListCommitsResponseData)
        )
      pullRequestUrlSpy = jest
        .spyOn(PullRequest, 'pullRequestUrl')
        .mockReturnValue('https://github.com/octokit/webhooks/pull/1')
      setIssueStatusSpy = jest
        .spyOn(Issue, 'setIssueStatus')
        .mockReturnValue(Promise.resolve())
      setVersionSpy = jest
        .spyOn(Issue, 'setVersion')
        .mockReturnValue(Promise.resolve())
    })

    afterEach(() => {
      createVersionSpy.mockRestore()
      errorSpy.mockRestore()
      getProjectSpy.mockRestore()
      getPullRequestSpy.mockRestore()
      infoSpy.mockRestore()
      listPullRequestCommitsSpy.mockRestore()
      pullRequestUrlSpy.mockRestore()
      setIssueStatusSpy.mockRestore()
      setVersionSpy.mockRestore()
    })

    it('does nothing if commits could not be fetched', async () => {
      listPullRequestCommitsSpy.mockReturnValue(Promise.resolve(undefined))
      await payload()
      const message = `Could not list commits for the release pull request ${prName}`
      expect(errorSpy).toHaveBeenLastCalledWith(message)
    })

    it('uses an existing release if one exists', async () => {
      await payload()
      expect(createVersionSpy).toHaveBeenCalledTimes(0)
      const message = `Found an existing release with ID ${mockJiraRelease.id}`
      expect(infoSpy).toHaveBeenCalledWith(message)
    })

    it('creates a new release if none exists', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(
        new Response(JSON.stringify({ values: [] }))
      )
      await payload()
      const expected = {
        description: mockJiraRelease.description,
        name: mockJiraRelease.name,
        projectId: '101010',
        released: true,
        releaseDate: expect.anything(), // Current time.
      }
      expect(createVersionSpy).toHaveBeenLastCalledWith(expected)
      const message = `Created a new release with ID ${mockJiraRelease.id}`
      expect(infoSpy).toHaveBeenCalledWith(message)
    })

    it('adds issues to the release', async () => {
      await payload()
      expect(setVersionSpy).toHaveBeenCalledWith(
        'ISSUE-123',
        mockJiraRelease.id
      )
      expect(setVersionSpy).toHaveBeenCalledWith(
        'ISSUE-456',
        mockJiraRelease.id
      )
    })

    it(`moves issues to ${Issue.JiraStatusDone}`, async () => {
      await payload()
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        'ISSUE-123',
        Issue.JiraStatusDone
      )
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        'ISSUE-456',
        Issue.JiraStatusDone
      )
    })
  })
})
