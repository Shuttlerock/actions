import * as core from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'

import { pullRequestConvertedToDraft } from '@sr-actions/pull-request-converted-to-draft-action/pullRequestConvertedToDraft'
import { InProgressLabel } from '@sr-services/Constants'
import * as Github from '@sr-services/Github'
import * as Jira from '@sr-services/Jira'
import {
  mockGithubPullRequestPayload,
  mockIssuesAddLabelsResponseData,
  mockJiraIssue,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  getIssue: jest.fn(),
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({
  addLabels: jest.fn(),
  getIssueKey: jest.fn(),
}))

describe('pull-request-converted-to-draft-action', () => {
  describe('pullRequestConvertedToDraft', () => {
    const payload = {
      ...mockGithubPullRequestPayload,
      action: 'converted_to_draft',
    }
    const prName = `${payload.repository.name}#${payload.pull_request.number}`
    let addLabelsSpy: jest.SpyInstance
    let getIssueSpy: jest.SpyInstance
    let getIssueKeySpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let setIssueStatusSpy: jest.SpyInstance

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockImplementation(
          (_repo: Github.Repository, _number: number, _labels: string[]) =>
            Promise.resolve(mockIssuesAddLabelsResponseData)
        )
      getIssueSpy = jest
        .spyOn(Jira, 'getIssue')
        .mockImplementation((_issueKey: string) =>
          Promise.resolve(mockJiraIssue)
        )
      getIssueKeySpy = jest
        .spyOn(Github, 'getIssueKey')
        .mockImplementation(
          (_payload: EventPayloads.WebhookPayloadPullRequestPullRequest) =>
            'ISSUE-236'
        )
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
      addLabelsSpy.mockRestore()
      getIssueSpy.mockRestore()
      getIssueKeySpy.mockRestore()
      infoSpy.mockRestore()
      setIssueStatusSpy.mockRestore()
    })

    it('sets the status of the Jira issue', async () => {
      await pullRequestConvertedToDraft(payload)
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        mockJiraIssue.id,
        Jira.JiraStatusInDevelopment
      )
    })

    it(`adds the '${InProgressLabel}' label`, async () => {
      await pullRequestConvertedToDraft(payload)
      expect(addLabelsSpy).toHaveBeenCalledWith(
        payload.repository.name,
        payload.pull_request.number,
        [InProgressLabel]
      )
    })

    it("does nothing if the pull request doesn't contain a Jira issue key", async () => {
      getIssueKeySpy.mockImplementation(
        (_payload: EventPayloads.WebhookPayloadPullRequestPullRequest) =>
          undefined
      )
      await pullRequestConvertedToDraft(payload)
      const message = `Couldn't extract a Jira issue key from ${prName} - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the Jira issue cannot be found', async () => {
      getIssueSpy.mockImplementation((_issueKey: string) => undefined)
      await pullRequestConvertedToDraft(payload)
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
            name: Jira.JiraStatusInDevelopment,
          },
        },
      }
      getIssueSpy.mockImplementation((_issueKey: string) =>
        Promise.resolve(validatedIssue)
      )
      await pullRequestConvertedToDraft(payload)
      const message = `Jira issue ${mockJiraIssue.key} is already in '${Jira.JiraStatusInDevelopment}' - ignoring`
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    })
  })
})