import fetch from 'node-fetch'

import { client } from '@sr-services/Jira/Client'
import { getIssue, getIssuePullRequestNumbers } from '@sr-services/Jira/Issue'
import { mockJiraIssue, mockJiraPullRequests } from '@sr-tests/Mocks'

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
      expect(data.id).toEqual('10000')
      spy.mockRestore()
    })

    it('includes the repository explicitly', async () => {
      const spy = jest
        .spyOn(client, 'findIssue')
        .mockImplementation((_key: string, _expand?: string) =>
          Promise.resolve(mockJiraIssue)
        )
      const data = await getIssue('10000')
      expect(data.fields.repository).toEqual('actions')
      spy.mockRestore()
    })
  })

  describe('getIssuePullRequestNumbers', () => {
    it('calls the Jira API', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockJiraPullRequests))
      )
      const numbers = await getIssuePullRequestNumbers('EXAMPLE-236')
      expect(numbers).toEqual([65])
    })
  })
})
