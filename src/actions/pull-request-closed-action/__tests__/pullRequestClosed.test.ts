import * as core from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'

import { pullRequestClosed } from '@sr-actions/pull-request-closed-action/pullRequestClosed'
import { ReleaseBranchName } from '@sr-services/Constants'
import * as Github from '@sr-services/Github'
import * as Jira from '@sr-services/Jira'
import {
  mockGithubPullRequestPayload,
  mockGithubRelease,
  mockJiraIssue,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  createRelease: jest.fn(),
  getIssue: jest.fn(),
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({
  createReleaseTag: jest.fn(),
  getIssueKey: jest.fn(),
}))

describe('pull-request-closed-action', () => {
  describe('pullRequestClosed', () => {
    const prName = `${mockGithubPullRequestPayload.repository.name}#${mockGithubPullRequestPayload.pull_request.number}`
    let getIssueSpy: jest.SpyInstance
    let getIssueKeySpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let setIssueStatusSpy: jest.SpyInstance

    beforeEach(() => {
      getIssueSpy = jest
        .spyOn(Jira, 'getIssue')
        .mockImplementation((_issueKey: string) =>
          Promise.resolve(mockJiraIssue)
        )
      getIssueKeySpy = jest
        .spyOn(Github, 'getIssueKey')
        .mockImplementation((_pr: Github.PullRequestContent) => 'ISSUE-236')
      infoSpy = jest
        .spyOn(core, 'info')
        .mockImplementation((_message: string) => undefined)
      setIssueStatusSpy = jest
        .spyOn(Jira, 'setIssueStatus')
        .mockImplementation((_issueId: string, _newStatus: string) =>
          Promise.resolve(undefined)
        )
    })

    afterEach(() => {
      getIssueSpy.mockRestore()
      getIssueKeySpy.mockRestore()
      infoSpy.mockRestore()
      setIssueStatusSpy.mockRestore()
    })

    it('sets the status of the Jira issue', async () => {
      await pullRequestClosed(mockGithubPullRequestPayload)
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        mockJiraIssue.id,
        Jira.JiraStatusValidated
      )
    })

    describe(`branch name is '${ReleaseBranchName}'`, () => {
      const releaseName = 'Energetic Eagle'
      const releaseVersion = '2021-01-12-0426'
      const releasePayload = {
        ...mockGithubPullRequestPayload,
        pull_request: {
          ...mockGithubPullRequestPayload.pull_request,
          head: {
            ...mockGithubPullRequestPayload.pull_request.head,
            ref: ReleaseBranchName,
          },
          title: `Release Candidate ${releaseVersion} (${releaseName})`,
        },
      } as Schema.PullRequestClosedEvent

      it('creates a Jira release', async () => {
        const createJiraReleaseSpy = jest.spyOn(Jira, 'createRelease')
        await pullRequestClosed(releasePayload)
        expect(createJiraReleaseSpy).toHaveBeenCalledWith(
          mockGithubPullRequestPayload.repository.name,
          mockGithubPullRequestPayload.pull_request.number,
          `v${releaseVersion}`,
          releaseName
        )
        createJiraReleaseSpy.mockRestore()
      })

      it('creates a Github release', async () => {
        const createReleaseTagSpy = jest.spyOn(Github, 'createReleaseTag')
        await pullRequestClosed(releasePayload)
        expect(createReleaseTagSpy).toHaveBeenCalledWith(
          mockGithubPullRequestPayload.repository.name,
          mockGithubRelease.tag_name,
          releaseName,
          expect.anything() // Release notes.
        )
        createReleaseTagSpy.mockRestore()
      })
    })

    it("does nothing if the pull request doesn't contain a Jira issue key", async () => {
      getIssueKeySpy.mockImplementation(
        (_pr: Github.PullRequestContent) => undefined
      )
      await pullRequestClosed(mockGithubPullRequestPayload)
      const message = `Couldn't extract a Jira issue key from ${prName} - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the Jira issue cannot be found', async () => {
      getIssueSpy.mockImplementation((_issueKey: string) => undefined)
      await pullRequestClosed(mockGithubPullRequestPayload)
      const message = `Couldn't find a Jira issue for ${prName} - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the Jira status is already correct', async () => {
      const validatedIssue = {
        ...mockJiraIssue,
        fields: {
          ...mockJiraIssue.fields,
          status: {
            ...mockJiraIssue.fields.status,
            name: Jira.JiraStatusValidated,
          },
        },
      }
      getIssueSpy.mockImplementation((_issueKey: string) =>
        Promise.resolve(validatedIssue)
      )
      await pullRequestClosed(mockGithubPullRequestPayload)
      const message = `Jira issue ${mockJiraIssue.key} is already in '${Jira.JiraStatusValidated}' - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })
  })
})
