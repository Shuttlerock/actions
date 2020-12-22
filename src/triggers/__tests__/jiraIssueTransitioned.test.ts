import * as core from '@actions/core'

import * as Jira from '@sr-services/Jira'
import { mockJiraBoard, mockJiraIssue } from '@sr-tests/Mocks'
import { jiraIssueTransitioned } from '@sr-triggers/jiraIssueTransitioned'

jest.mock('@sr-services/Jira', () => ({
  getBoard: jest.fn(),
  getChildIssues: jest.fn(),
  getColumns: jest.fn(),
  getIssue: jest.fn(),
  isIssueOnBoard: jest.fn(),
  JiraIssueTypeEpic: 'Epic',
  JiraStatusInDevelopment: 'In development',
  JiraStatusTechnicalPlanning: 'Technical Planning',
  JiraStatusValidated: 'Validated',
  moveIssueToBoard: jest.fn(),
  setIssueStatus: jest.fn(),
}))

const childIssue = { ...mockJiraIssue, id: '20000' }
const parentIssue = mockJiraIssue
const issueKey = childIssue.key
const email = 'user@example.com'
const columns = [
  { name: 'Has issues' },
  { name: 'In development' },
  { name: 'Tech review' },
  { name: 'Validated' },
] as Jira.JiraBoardColumn[]

describe('jiraIssueTransitioned', () => {
  let getBoardSpy: jest.SpyInstance
  let getChildIssuesSpy: jest.SpyInstance
  let getColumnsSpy: jest.SpyInstance
  let getIssueSpy: jest.SpyInstance
  let infoSpy: jest.SpyInstance
  let isIssueOnBoardSpy: jest.SpyInstance
  let moveIssueToBoardSpy: jest.SpyInstance
  let setIssueStatusSpy: jest.SpyInstance

  beforeEach(() => {
    getBoardSpy = jest
      .spyOn(Jira, 'getBoard')
      .mockImplementation((_projectId: string) =>
        Promise.resolve(mockJiraBoard)
      )
    getChildIssuesSpy = jest
      .spyOn(Jira, 'getChildIssues')
      .mockImplementation((_key: string) => Promise.resolve([childIssue]))
    getColumnsSpy = jest
      .spyOn(Jira, 'getColumns')
      .mockImplementation((_projectId: string) => Promise.resolve(columns))
    getIssueSpy = jest
      .spyOn(Jira, 'getIssue')
      .mockImplementation((_key: string) => Promise.resolve(parentIssue))
    infoSpy = jest
      .spyOn(core, 'info')
      .mockImplementation((_message: string) => undefined)
    isIssueOnBoardSpy = jest
      .spyOn(Jira, 'isIssueOnBoard')
      .mockImplementation((_boardId: number, _issueId: string) =>
        Promise.resolve(true)
      )
    moveIssueToBoardSpy = jest
      .spyOn(Jira, 'moveIssueToBoard')
      .mockImplementation((_boardId: number, _issueId: string) =>
        Promise.resolve(204)
      )
    setIssueStatusSpy = jest
      .spyOn(Jira, 'setIssueStatus')
      .mockImplementation((_issueId: string, _newStatus: string) =>
        Promise.resolve(undefined)
      )
  })

  afterEach(() => {
    getBoardSpy.mockRestore()
    getChildIssuesSpy.mockRestore()
    getColumnsSpy.mockRestore()
    getIssueSpy.mockRestore()
    infoSpy.mockRestore()
    isIssueOnBoardSpy.mockRestore()
    moveIssueToBoardSpy.mockRestore()
    setIssueStatusSpy.mockRestore()
  })

  it('moves the issue to the board if necessary', async () => {
    isIssueOnBoardSpy.mockImplementation((_boardId: number, _issueId: string) =>
      Promise.resolve(false)
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(moveIssueToBoardSpy).toHaveBeenCalledWith(
      mockJiraBoard.id,
      parentIssue.id
    )
  })

  it('moves the parent if necessary', async () => {
    const validatedChild = {
      ...childIssue,
      fields: {
        ...childIssue.fields,
        status: { name: Jira.JiraStatusValidated },
      },
    }
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([validatedChild])
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledWith(
      parentIssue.id,
      Jira.JiraStatusValidated
    )
    const message = `Moved the parent issue ${parentIssue.key} to '${Jira.JiraStatusValidated}'`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })

  it("doesn't move the parent if is not necessary", async () => {
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([childIssue])
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    const message = `The parent issue ${parentIssue.key} is already in 'In development' - nothing to do`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })

  it("doesn't move epics to 'Validated' automatically", async () => {
    const epic = {
      ...parentIssue,
      fields: {
        ...parentIssue.fields,
        issuetype: {
          ...parentIssue.fields.issuetype,
          name: Jira.JiraIssueTypeEpic,
        },
      },
    }
    getIssueSpy.mockImplementation((_key: string) => Promise.resolve(epic))
    const validatedChild = {
      ...childIssue,
      fields: {
        ...childIssue.fields,
        status: { name: Jira.JiraStatusValidated },
      },
    }
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([validatedChild])
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    const message = `The parent issue ${parentIssue.key} is an epic, so it can't be moved to '${Jira.JiraStatusValidated}' automatically - nothing to do`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })

  it("marks epics as 'In development' if any of the children are 'In development'", async () => {
    const epic = {
      ...parentIssue,
      fields: {
        ...parentIssue.fields,
        issuetype: {
          ...parentIssue.fields.issuetype,
          name: Jira.JiraIssueTypeEpic,
        },
        status: { name: Jira.JiraStatusValidated },
      },
    }
    getIssueSpy.mockImplementation((_key: string) => Promise.resolve(epic))
    const inDevelopmentChild = {
      ...childIssue,
      fields: {
        ...childIssue.fields,
        status: { name: Jira.JiraStatusInDevelopment },
      },
    }
    const planningChild = {
      ...childIssue,
      fields: {
        ...childIssue.fields,
        status: { name: Jira.JiraStatusTechnicalPlanning },
      },
    }
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([inDevelopmentChild, planningChild])
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledWith(
      parentIssue.id,
      Jira.JiraStatusInDevelopment
    )
  })

  it('does nothing the issue has no parent', async () => {
    const noParent = {
      ...childIssue,
      fields: { ...childIssue.fields, parent: undefined },
    }
    getIssueSpy.mockImplementation((_key: string) => Promise.resolve(noParent))
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledTimes(0)
    const message = `Issue ${noParent.key} has no parent issue - nothing to do`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })
})
