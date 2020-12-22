import * as core from '@actions/core'

import * as Jira from '@sr-services/Jira'
import { mockJiraIssue } from '@sr-tests/Mocks'
import { jiraStoryPointsUpdated } from '@sr-triggers/jiraStoryPointsUpdated'

const JiraFieldStoryPointEstimate = 'Story point estimate'

jest.mock('@sr-services/Jira', () => ({
  getChildIssues: jest.fn(),
  getIssue: jest.fn(),
  updateCustomField: jest.fn(),
  JiraFieldStoryPointEstimate: 'Story point estimate',
}))

const childIssue = { ...mockJiraIssue, id: '20000' }
const parentIssue = {
  ...mockJiraIssue,
  fields: { ...mockJiraIssue.fields, parent: undefined },
}
const issueKey = childIssue.key
const email = 'user@example.com'

describe('jiraStoryPointsUpdated', () => {
  let getChildIssuesSpy: jest.SpyInstance
  let getIssueSpy: jest.SpyInstance
  let infoSpy: jest.SpyInstance
  let updateCustomFieldSpy: jest.SpyInstance

  beforeEach(() => {
    getChildIssuesSpy = jest
      .spyOn(Jira, 'getChildIssues')
      .mockImplementation((_key: string) => Promise.resolve([childIssue]))
    getIssueSpy = jest
      .spyOn(Jira, 'getIssue')
      .mockImplementation((_key: string) => Promise.resolve(parentIssue))
    infoSpy = jest
      .spyOn(core, 'info')
      .mockImplementation((_message: string) => undefined)
    updateCustomFieldSpy = jest
      .spyOn(Jira, 'updateCustomField')
      .mockImplementation(
        (_issue: Jira.Issue, _fieldName: string, _value: string | number) =>
          Promise.resolve(undefined)
      )
  })

  afterEach(() => {
    getChildIssuesSpy.mockRestore()
    getIssueSpy.mockRestore()
    infoSpy.mockRestore()
    updateCustomFieldSpy.mockRestore()
  })

  it("updates the parent with the sum of the children's points", async () => {
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([childIssue, childIssue])
    )
    await jiraStoryPointsUpdated(email, issueKey)
    expect(updateCustomFieldSpy).toHaveBeenCalledWith(
      parentIssue,
      JiraFieldStoryPointEstimate,
      22
    )
    const message = `Issue ${parentIssue.key} has no parent - finished`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })

  it('does nothing if the children have zero points', async () => {
    const zeroPointsChild = {
      ...childIssue,
      fields: { ...childIssue.fields, storyPointEstimate: 0 },
    }
    getChildIssuesSpy.mockImplementation((_key: string) =>
      Promise.resolve([zeroPointsChild])
    )
    await jiraStoryPointsUpdated(email, issueKey)
    expect(updateCustomFieldSpy).toHaveBeenCalledTimes(0)
    const message = `Children of ${parentIssue.key} have zero points estimated - giving up`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })

  it("does nothing if the estimate won't change", async () => {
    const unchangingParent = {
      ...parentIssue,
      id: '20000',
      fields: { ...mockJiraIssue.fields, storyPointEstimate: 11 },
    }
    getIssueSpy.mockImplementation((_key: string) =>
      Promise.resolve(unchangingParent)
    )
    await jiraStoryPointsUpdated(email, issueKey)
    expect(updateCustomFieldSpy).toHaveBeenCalledTimes(0)
    const message = `Issue ${parentIssue.key} estimate is already set to 11 points - giving up`
    expect(infoSpy).toHaveBeenLastCalledWith(message)
  })
})
