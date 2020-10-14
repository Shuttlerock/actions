import fetch from 'node-fetch'

import issue from '@sr-services/Jira/__tests__/fixtures/issue.json'
import pullRequests from '@sr-services/Jira/__tests__/fixtures/pull-requests.json'
import { client } from '@sr-services/Jira/Client'
import { getIssue, getIssuePullRequestNumbers } from '@sr-services/Jira/Issue'

const { Response } = jest.requireActual('node-fetch')

jest.mock('node-fetch', () => jest.fn())

describe('Issue', () => {
  describe('getIssue', () => {
    it('calls the Jira API', async () => {
      const spy = jest
        .spyOn(client, 'findIssue')
        .mockImplementation((_key: string, _expand?: string) =>
          Promise.resolve(issue)
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
          Promise.resolve(issue)
        )
      const data = await getIssue('10000')
      expect(data.fields.repository).toEqual('actions')
      spy.mockRestore()
    })
  })

  describe('getIssuePullRequestNumbers', () => {
    it('calls the Jira API', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(pullRequests))
      )
      const numbers = await getIssuePullRequestNumbers('EXAMPLE-236')
      expect(numbers).toEqual([65])
    })
  })
})
