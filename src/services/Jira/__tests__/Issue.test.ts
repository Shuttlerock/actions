import { TransitionObject } from 'jira-client'
import fetch from 'node-fetch'

import { client } from '@sr-services/Jira/Client'
import {
  getEpic,
  getIssue,
  getIssuePullRequestNumbers,
  issueUrl,
  JiraIssueTypeEpic,
  JiraStatusValidated,
  setIssueStatus,
} from '@sr-services/Jira/Issue'
import * as Issue from '@sr-services/Jira/Issue'
import {
  mockJiraIssue,
  mockJiraPullRequests,
  mockJiraTransitions,
} from '@sr-tests/Mocks'

const { Response } = jest.requireActual('node-fetch')

jest.mock('node-fetch', () => jest.fn())

describe('Issue', () => {
  describe('getIssue', () => {
    it('calls the Jira API', async () => {
      const spy = jest
        .spyOn(client, 'findIssue')
        .mockImplementation((_key: string, _expand?: string) =>
          Promise.resolve(mockJiraIssue)
        )
      const data = await getIssue('10000')
      expect(spy).toHaveBeenCalledWith('10000', 'names')
      expect(data?.id).toEqual('10000')
      spy.mockRestore()
    })

    it('includes the repository explicitly', async () => {
      const spy = jest
        .spyOn(client, 'findIssue')
        .mockImplementation((_key: string, _expand?: string) =>
          Promise.resolve(mockJiraIssue)
        )
      const data = await getIssue('10000')
      expect(data?.fields.repository).toEqual('actions')
      spy.mockRestore()
    })
  })

  describe('getEpic', () => {
    const issueKey = 'ISSUE-236'
    const epicKey = 'ISSUE-235'
    const epic = {
      ...mockJiraIssue,
      fields: {
        ...mockJiraIssue.fields,
        issuetype: { ...mockJiraIssue.fields, name: JiraIssueTypeEpic },
      },
      key: epicKey,
    }
    let getIssueSpy: jest.SpyInstance
    let recursiveGetEpicSpy: jest.SpyInstance

    beforeEach(() => {
      getIssueSpy = jest
        .spyOn(Issue, 'getIssue')
        .mockImplementation((_key: string) => Promise.resolve(mockJiraIssue))
      recursiveGetEpicSpy = jest
        .spyOn(Issue, 'recursiveGetEpic')
        .mockImplementation((_key: string) => Promise.resolve(undefined))
    })

    afterEach(() => {
      getIssueSpy.mockRestore()
      recursiveGetEpicSpy.mockRestore()
    })

    it("returns undefined if the issue can't be found", async () => {
      getIssueSpy.mockImplementation((_key: string) =>
        Promise.resolve(undefined)
      )
      const result = await getEpic(issueKey)
      expect(result).toBeUndefined()
      expect(recursiveGetEpicSpy).toHaveBeenCalledTimes(0)
    })

    it('returns the issue if it is an epic', async () => {
      getIssueSpy.mockImplementation((_key: string) => Promise.resolve(epic))
      const result = await getEpic(issueKey)
      expect(result?.key).toEqual(epicKey)
      expect(getIssueSpy).toHaveBeenCalledWith(issueKey)
      expect(recursiveGetEpicSpy).toHaveBeenCalledTimes(0)
    })

    it('returns the parent issue if it is an epic', async () => {
      const issue = {
        ...mockJiraIssue,
        fields: { ...mockJiraIssue.fields, parent: epic },
      }
      getIssueSpy
        .mockImplementationOnce((_key: string) => Promise.resolve(issue))
        .mockImplementationOnce((_key: string) => Promise.resolve(epic))
      const result = await getEpic(issueKey)
      expect(result?.key).toEqual(epicKey)
      expect(getIssueSpy).toHaveBeenCalledWith(issueKey)
      expect(recursiveGetEpicSpy).toHaveBeenCalledTimes(0)
    })

    it('recurses if the parent is not an epic', async () => {
      const issue = {
        ...mockJiraIssue,
        fields: {
          ...mockJiraIssue.fields,
          parent: { ...mockJiraIssue, key: 'ISSUE-234' },
        },
      }
      getIssueSpy.mockImplementationOnce((_key: string) =>
        Promise.resolve(issue)
      )
      await getEpic(issueKey)
      expect(recursiveGetEpicSpy).toHaveBeenCalledWith('ISSUE-234')
    })
  })

  describe('getIssuePullRequestNumbers', () => {
    it('calls the Jira API', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJiraPullRequests))
      )
      const numbers = await getIssuePullRequestNumbers('ISSUE-236', 'actions')
      expect(numbers).toEqual([64])
    })
  })

  describe('issueUrl', () => {
    it('returns the URL', () => {
      const expected = 'https://example.atlassian.net/browse/ISSUE-236'
      expect(issueUrl('ISSUE-236')).toEqual(expected)
    })
  })

  describe('setIssueStatus', () => {
    it('calls the Jira API', async () => {
      const spyListTransitions = jest
        .spyOn(client, 'listTransitions')
        .mockImplementation((_issueId: string) =>
          Promise.resolve({ transitions: mockJiraTransitions })
        )
      const spyTransitionIssue = jest
        .spyOn(client, 'transitionIssue')
        .mockImplementation((_issueId: string, _transition: TransitionObject) =>
          Promise.resolve({})
        )
      await setIssueStatus('10000', JiraStatusValidated)
      expect(spyTransitionIssue).toHaveBeenCalledWith('10000', {
        transition: mockJiraTransitions[1],
      })
      spyListTransitions.mockRestore()
      spyTransitionIssue.mockRestore()
    })
  })
})
