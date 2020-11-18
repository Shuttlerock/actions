import fetch from 'node-fetch'

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
})
