import * as core from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'

import rawPayload from '@sr-actions/check-run-completed-action/__tests__/fixtures/check-run-failed-payload.json'
import { checkRunCompleted } from '@sr-actions/check-run-completed-action/checkRunCompleted'
import { HasIssuesLabel } from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import * as Jira from '@sr-services/Jira'
import * as Slack from '@sr-services/Slack'
import {
  mockCredentials,
  mockGithubPullRequest,
  mockIssuesAddLabelsResponseData,
  mockJiraIssue,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  getIssue: jest.fn(),
  JiraStatusHasIssues: 'has-issues',
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({
  addLabels: jest.fn(),
  getIssueKey: jest.fn(),
  getPullRequest: jest.fn(),
}))
jest.mock('@sr-services/Slack', () => ({
  sendUserMessage: jest.fn(),
}))

describe('check-run-completed-action', () => {
  describe('checkRunCompleted', () => {
    let addLabelsSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance
    let fetchCredentialsSpy: jest.SpyInstance
    let getIssueKeySpy: jest.SpyInstance
    let getIssueSpy: jest.SpyInstance
    let getPullRequestSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance
    let setIssueStatusSpy: jest.SpyInstance

    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const payload = (rawPayload as unknown) as EventPayloads.WebhookPayloadCheckRun

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockImplementation(
          (_repo: Github.Repository, _num: number, _added: string[]) =>
            Promise.resolve(mockIssuesAddLabelsResponseData)
        )
      errorSpy = jest
        .spyOn(core, 'error')
        .mockImplementation((_message: string | Error) => undefined)
      fetchCredentialsSpy = jest
        .spyOn(Credentials, 'fetchCredentials')
        .mockImplementation((_email?: string) =>
          Promise.resolve(mockCredentials)
        )
      getIssueKeySpy = jest
        .spyOn(Github, 'getIssueKey')
        .mockImplementation(
          (_content: Github.PullRequestContent) => 'ISSUE-111'
        )
      getIssueSpy = jest
        .spyOn(Jira, 'getIssue')
        .mockImplementation((_issueKey: string) =>
          Promise.resolve(mockJiraIssue)
        )
      getPullRequestSpy = jest
        .spyOn(Github, 'getPullRequest')
        .mockImplementation((_repo: Github.Repository, _number: number) =>
          Promise.resolve(mockGithubPullRequest)
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
      errorSpy.mockRestore()
      fetchCredentialsSpy.mockRestore()
      getIssueKeySpy.mockRestore()
      getIssueSpy.mockRestore()
      getPullRequestSpy.mockRestore()
      infoSpy.mockRestore()
      setIssueStatusSpy.mockRestore()
    })

    it('does nothing if there are no pull requests associated with the check run', async () => {
      const noPulls = {
        ...payload,
        check_run: { ...payload.check_run, pull_requests: [] },
      }
      await checkRunCompleted(noPulls)
      const message =
        'There are no pull requests associated with this check run - ignoring'
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the run succeeded', async () => {
      const succeeded = {
        ...payload,
        check_run: { ...payload.check_run, conclusion: 'success' },
      }
      await checkRunCompleted(succeeded)
      const message = "actions#142 didn't fail - ignoring"
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it("does nothing if the pull request can't be found", async () => {
      getPullRequestSpy.mockImplementation(
        (_repo: Github.Repository, _number: number) =>
          Promise.resolve(undefined)
      )
      await checkRunCompleted(payload)
      const message = 'Could not fetch the pull request actions#142'
      expect(errorSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it("does nothing if the Jira issue key can't be found", async () => {
      getIssueKeySpy.mockImplementation(
        (_content: Github.PullRequestContent) => undefined
      )
      await checkRunCompleted(payload)
      const message =
        "Couldn't extract a Jira issue key from actions#142 - ignoring"
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it("does nothing if the Jira issue can't be found", async () => {
      getIssueSpy.mockImplementation((_issueKey: string) =>
        Promise.resolve(undefined)
      )
      await checkRunCompleted(payload)
      const message = "Couldn't find a Jira issue for actions#142 - ignoring"
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it('adds the has-issues label to the pull request', async () => {
      await checkRunCompleted(payload)
      expect(addLabelsSpy).toHaveBeenCalledWith('actions', 123, [
        HasIssuesLabel,
      ])
    })

    it('moves the Jira issue', async () => {
      await checkRunCompleted(payload)
      expect(setIssueStatusSpy).toHaveBeenCalledWith(
        '10000',
        Jira.JiraStatusHasIssues
      )
    })

    it('sends a slack message', async () => {
      const spy = jest.spyOn(Slack, 'sendUserMessage')
      await checkRunCompleted(payload)
      const message = `A check has failed for _<${mockGithubPullRequest.html_url}|${mockGithubPullRequest.title}>_`
      expect(spy).toHaveBeenCalledWith('my-slack-id', message)
      spy.mockRestore()
    })
  })
})
