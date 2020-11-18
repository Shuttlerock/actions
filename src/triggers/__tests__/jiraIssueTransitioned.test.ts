import * as core from '@actions/core'

import * as Jira from '@sr-services/Jira'
import { mockJiraIssue } from '@sr-tests/Mocks'
import { jiraIssueTransitioned } from '@sr-triggers/jiraIssueTransitioned'

jest.mock('@sr-services/Jira', () => ({
  getChildIssues: jest.fn(),
  getColumns: jest.fn(),
  getIssue: jest.fn(),
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
  let getChildIssuesSpy: jest.SpyInstance
  let getColumnsSpy: jest.SpyInstance
  let getIssueSpy: jest.SpyInstance
  let infoSpy: jest.SpyInstance
  let setIssueStatusSpy: jest.SpyInstance

  beforeEach(() => {
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
    setIssueStatusSpy = jest
      .spyOn(Jira, 'setIssueStatus')
      .mockImplementation((_issueId: string, _newStatus: string) =>
        Promise.resolve(undefined)
      )
  })

  afterEach(() => {
    getChildIssuesSpy.mockRestore()
    getColumnsSpy.mockRestore()
    getIssueSpy.mockRestore()
    infoSpy.mockRestore()
    setIssueStatusSpy.mockRestore()
  })

  it('moves the parent if necessary', async () => {
    const validatedChild = {
      ...childIssue,
      fields: { ...childIssue.fields, status: { name: 'Validated' } },
    }
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([validatedChild])
    )
    await jiraIssueTransitioned(email, issueKey)
    expect(setIssueStatusSpy).toHaveBeenCalledWith(parentIssue.id, 'Validated')
    const message = `Moved the parent issue ${parentIssue.key} to 'Validated'`
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
