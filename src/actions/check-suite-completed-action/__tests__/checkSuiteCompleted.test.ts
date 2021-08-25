import * as core from '@actions/core'
import { GitGetCommitResponseData } from '@octokit/types'
import Schema from '@octokit/webhooks-types'

import rawPayload from '@sr-actions/check-suite-completed-action/__tests__/fixtures/check-suite-failure-payload.json'
import { checkSuiteCompleted } from '@sr-actions/check-suite-completed-action/checkSuiteCompleted'
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
  extractPullRequestNumber: (message: string) =>
    parseInt(message.replace(/^.*\[#(\d+)\].*$/, '$1'), 10) || undefined,
  getCommit: jest.fn(),
  getIssueKey: jest.fn(),
  getPullRequest: jest.fn(),
}))
jest.mock('@sr-services/Slack', () => ({
  positiveEmoji: () => ':fire:',
  sendUserMessage: jest.fn(),
}))

describe('check-suite-completed-action', () => {
  describe('checkSuiteCompleted', () => {
    let addLabelsSpy: jest.SpyInstance
    let errorSpy: jest.SpyInstance
    let fetchCredentialsSpy: jest.SpyInstance
    let getCommitSpy: jest.SpyInstance
    let getIssueKeySpy: jest.SpyInstance
    let getIssueSpy: jest.SpyInstance
    let getPullRequestSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance

    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const checkSuitePayload = rawPayload as unknown as Schema.CheckSuiteEvent

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
      getCommitSpy = jest.spyOn(Github, 'getCommit').mockReturnValue(
        Promise.resolve({
          message: '[#142] Fix a bug!',
        } as GitGetCommitResponseData)
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
    })

    afterEach(() => {
      addLabelsSpy.mockRestore()
      errorSpy.mockRestore()
      fetchCredentialsSpy.mockRestore()
      getCommitSpy.mockRestore()
      getIssueKeySpy.mockRestore()
      getIssueSpy.mockRestore()
      getPullRequestSpy.mockRestore()
      infoSpy.mockRestore()
    })

    it('does nothing if there are no pull requests associated with the check suite', async () => {
      getCommitSpy.mockReturnValue(
        Promise.resolve({
          message: 'No PR number!',
        } as GitGetCommitResponseData)
      )
      const noPulls = {
        ...checkSuitePayload,
        check_suite: { ...checkSuitePayload.check_suite, pull_requests: [] },
      }
      await checkSuiteCompleted(noPulls)
      const message =
        'There are no pull requests associated with this check suite - ignoring'
      expect(infoSpy).toHaveBeenLastCalledWith(message)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    describe('successful check', () => {
      it('sends a Slack message', async () => {
        const spy = jest.spyOn(Slack, 'sendUserMessage')
        const succeeded = {
          ...checkSuitePayload,
          check_suite: {
            ...checkSuitePayload.check_suite,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            conclusion: 'success' as any,
          },
        }
        await checkSuiteCompleted(succeeded)
        expect(addLabelsSpy).toHaveBeenCalledTimes(0)
        const message = `Check suite _*CircleCI Checks*_ passed for *<${mockGithubPullRequest.html_url}|${mockGithubPullRequest.title}>* :fire:`
        expect(spy).toHaveBeenCalledWith('my-slack-id', message)
        spy.mockRestore()
      })
    })

    describe('failed check', () => {
      it('sends a slack message', async () => {
        const spy = jest.spyOn(Slack, 'sendUserMessage')
        await checkSuiteCompleted(checkSuitePayload)
        const message = `Check suite _*CircleCI Checks*_ failed for *<${mockGithubPullRequest.html_url}|${mockGithubPullRequest.title}>*`
        expect(spy).toHaveBeenCalledWith('my-slack-id', message)
        spy.mockRestore()
      })

      it("does nothing if the pull request can't be found", async () => {
        getPullRequestSpy.mockImplementation(
          (_repo: Github.Repository, _number: number) =>
            Promise.resolve(undefined)
        )
        await checkSuiteCompleted(checkSuitePayload)
        const message = 'Could not fetch the pull request actions#142'
        expect(errorSpy).toHaveBeenLastCalledWith(message)
        expect(addLabelsSpy).toHaveBeenCalledTimes(0)
      })

      it("does nothing if the Jira issue key can't be found", async () => {
        getIssueKeySpy.mockImplementation(
          (_content: Github.PullRequestContent) => undefined
        )
        await checkSuiteCompleted(checkSuitePayload)
        const message =
          "Couldn't extract a Jira issue key from actions#142 - ignoring"
        expect(infoSpy).toHaveBeenLastCalledWith(message)
        expect(addLabelsSpy).toHaveBeenCalledTimes(0)
      })

      it("does nothing if the Jira issue can't be found", async () => {
        getIssueSpy.mockImplementation((_issueKey: string) =>
          Promise.resolve(undefined)
        )
        await checkSuiteCompleted(checkSuitePayload)
        const message = "Couldn't find a Jira issue for actions#142 - ignoring"
        expect(infoSpy).toHaveBeenLastCalledWith(message)
        expect(addLabelsSpy).toHaveBeenCalledTimes(0)
      })

      it('adds the has-issues label to the pull request', async () => {
        await checkSuiteCompleted(checkSuitePayload)
        expect(addLabelsSpy).toHaveBeenCalledWith('actions', 123, [
          HasIssuesLabel,
        ])
      })
    })
  })
})
