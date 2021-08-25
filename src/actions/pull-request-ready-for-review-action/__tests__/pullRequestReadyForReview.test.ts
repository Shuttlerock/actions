import * as core from '@actions/core'
import Schema from '@octokit/webhooks-types'

import { pullRequestReadyForReview } from '@sr-actions/pull-request-ready-for-review-action/pullRequestReadyForReview'
import { InfraChangeLabel, PleaseReviewLabel } from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import * as Jira from '@sr-services/Jira'
import {
  mockGitFile,
  mockGithubPullRequestPayload,
  mockIssuesAddAssigneesResponseData,
  mockIssuesAddLabelsResponseData,
  mockJiraIssue,
  mockPullsRequestReviewersResponseData,
  mockRepository,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  getReviewColumn: jest.fn(),
  getIssue: jest.fn(),
  JiraStatusTechReview: 'Tech review',
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({
  addLabels: jest.fn(),
  getIssueKey: jest.fn(),
  assignOwners: jest.fn(),
  assignReviewers: jest.fn(),
  listPullRequestFiles: jest.fn(),
}))

describe('pull-request-ready-for-review-action', () => {
  describe('pullRequestReadyForReview', () => {
    const payload = {
      ...mockGithubPullRequestPayload,
      action: 'ready_for_review',
    } as Schema.PullRequestEvent
    const prName = `${payload.repository.name}#${payload.pull_request.number}`
    let addLabelsSpy: jest.SpyInstance
    let assignOwnersSpy: jest.SpyInstance
    let assignReviewersSpy: jest.SpyInstance
    let fetchRepositorySpy: jest.SpyInstance
    let getIssueKeySpy: jest.SpyInstance
    let getIssueSpy: jest.SpyInstance
    let getReviewColumnSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let listPullRequestFilesSpy: jest.SpyInstance
    let setIssueStatusSpy: jest.SpyInstance

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockReturnValue(Promise.resolve(mockIssuesAddLabelsResponseData))
      assignOwnersSpy = jest
        .spyOn(Github, 'assignOwners')
        .mockReturnValue(Promise.resolve(mockIssuesAddAssigneesResponseData))
      assignReviewersSpy = jest
        .spyOn(Github, 'assignReviewers')
        .mockReturnValue(Promise.resolve(mockPullsRequestReviewersResponseData))
      fetchRepositorySpy = jest
        .spyOn(Credentials, 'fetchRepository')
        .mockReturnValue(Promise.resolve(mockRepository))
      getIssueSpy = jest
        .spyOn(Jira, 'getIssue')
        .mockReturnValue(Promise.resolve(mockJiraIssue))
      getIssueKeySpy = jest
        .spyOn(Github, 'getIssueKey')
        .mockReturnValue('ISSUE-236')
      getReviewColumnSpy = jest
        .spyOn(Jira, 'getReviewColumn')
        .mockReturnValue(Promise.resolve(Jira.JiraStatusTechReview))
      infoSpy = jest.spyOn(core, 'info').mockReturnValue(undefined)
      listPullRequestFilesSpy = jest
        .spyOn(Github, 'listPullRequestFiles')
        .mockReturnValue(Promise.resolve([mockGitFile]))
      setIssueStatusSpy = jest
        .spyOn(Jira, 'setIssueStatus')
        .mockReturnValue(Promise.resolve(undefined))
    })

    afterEach(() => {
      addLabelsSpy.mockRestore()
      assignOwnersSpy.mockRestore()
      assignReviewersSpy.mockRestore()
      fetchRepositorySpy.mockRestore()
      getIssueSpy.mockRestore()
      getIssueKeySpy.mockRestore()
      getReviewColumnSpy.mockRestore()
      infoSpy.mockRestore()
      listPullRequestFilesSpy.mockRestore()
      setIssueStatusSpy.mockRestore()
    })

    it('sets the status of the Jira issue', async () => {
      await pullRequestReadyForReview(payload)
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        mockJiraIssue.id,
        Jira.JiraStatusTechReview
      )
    })

    it(`adds the '${PleaseReviewLabel}' and '${InfraChangeLabel}' labels`, async () => {
      await pullRequestReadyForReview(payload)
      expect(addLabelsSpy).toHaveBeenCalledWith(
        payload.repository.name,
        payload.pull_request.number,
        [PleaseReviewLabel, InfraChangeLabel]
      )
    })

    it('assigns owners', async () => {
      await pullRequestReadyForReview(payload)
      expect(assignOwnersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        payload.pull_request.number,
        ['dhh']
      )
    })

    it('assigns reviewers', async () => {
      await pullRequestReadyForReview(payload)
      expect(assignReviewersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        payload.pull_request.number,
        ['wycats']
      )
    })

    it("does nothing if the pull request doesn't contain a Jira issue key", async () => {
      getIssueKeySpy.mockReturnValue(undefined)
      await pullRequestReadyForReview(payload)
      const message = `Couldn't extract a Jira issue key from ${prName} - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the Jira issue cannot be found', async () => {
      getIssueSpy.mockReturnValue(undefined)
      await pullRequestReadyForReview(payload)
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
            name: Jira.JiraStatusTechReview,
          },
        },
      }
      getIssueSpy.mockReturnValue(Promise.resolve(validatedIssue))
      await pullRequestReadyForReview(payload)
      const message = `Jira issue ${mockJiraIssue.key} is already in '${Jira.JiraStatusTechReview}' - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })
  })
})
