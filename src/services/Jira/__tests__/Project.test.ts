import fetch from 'node-fetch'

import { client } from '@sr-services/Jira/Client'
import { JiraStatusInProgress } from '@sr-services/Jira/Issue'
import * as Project from '@sr-services/Jira/Project'
import {
  mockJiraBoard,
  mockJiraBoardColumn,
  mockJiraBoardConfiguration,
  mockJiraBoardList,
} from '@sr-tests/Mocks'

const { Response } = jest.requireActual('node-fetch')

jest.mock('node-fetch', () => jest.fn())

describe('Project', () => {
  describe('getBoard', () => {
    it('calls the Jira API', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJiraBoardList))
      )
      const board = await Project.getBoard('10003')
      expect(board?.id).toEqual(123)
    })
  })

  describe('getColumns', () => {
    it('calls the Jira API', async () => {
      const spy = jest
        .spyOn(Project, 'getBoard')
        .mockImplementation((_id: string) => Promise.resolve(mockJiraBoard))

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJiraBoardConfiguration))
      )
      const columns = (await Project.getColumns('10003')) || []
      expect(columns.length).toEqual(1)
      expect(columns[0].name).toEqual(mockJiraBoardColumn.name)
      spy.mockRestore()
    })
  })

  describe('getInProgressColumn', () => {
    it('returns the correct column name', async () => {
      const spy = jest
        .spyOn(Project, 'getColumns')
        .mockReturnValue(
          Promise.resolve([mockJiraBoardColumn, { name: JiraStatusInProgress }])
        )
      const columnName = await Project.getInProgressColumn('10003')
      expect(columnName).toEqual(JiraStatusInProgress)
      spy.mockRestore()
    })
  })

  describe('getProject', () => {
    it('calls the Jira API', async () => {
      const project = { id: 'my-project-id', key: 'my-project-key' }
      const getProjectSpy = jest
        .spyOn(client, 'getProject')
        .mockReturnValue(Promise.resolve(project))
      const returned = await Project.getProject(project.key)
      expect(getProjectSpy).toHaveBeenCalledWith(project.key)
      expect(returned.id).toEqual(project.id)
      getProjectSpy.mockRestore()
    })
  })
})
