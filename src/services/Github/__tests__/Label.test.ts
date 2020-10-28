import {
  IssuesAddLabelsResponseData,
  IssuesSetLabelsResponseData,
  OctokitResponse,
} from '@octokit/types'

import * as Client from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'
import { addLabels, setLabels } from '@sr-services/Github/Label'
import { organizationName } from '@sr-services/Inputs'
import {
  mockIssuesAddLabelsResponseData,
  mockIssuesSetLabelsResponseData,
} from '@sr-tests/Mocks'

const repo = 'my-repo'

describe('PullRequest', () => {
  describe('addLabels', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(Client.client.issues, 'addLabels')
        .mockImplementation(
          (_args?: {
            issue_number: number
            labels: string[]
            owner: string
            repo: Repository
          }) =>
            Promise.resolve({
              data: mockIssuesAddLabelsResponseData,
            } as OctokitResponse<IssuesAddLabelsResponseData>)
        )
      const result = await addLabels(repo, 23, ['my-label'])
      expect(spy).toHaveBeenCalledWith({
        issue_number: 23,
        labels: ['my-label'],
        owner: organizationName(),
        repo,
      })
      expect(result[0].name).toEqual('my-label')
      spy.mockRestore()
    })
  })

  describe('setLabels', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(Client.client.issues, 'setLabels')
        .mockImplementation(
          (_args?: {
            issue_number: number
            labels?: string[]
            owner: string
            repo: Repository
          }) =>
            Promise.resolve({
              data: mockIssuesSetLabelsResponseData,
            } as OctokitResponse<IssuesSetLabelsResponseData>)
        )
      const result = await setLabels(repo, 23, ['my-label'])
      expect(spy).toHaveBeenCalledWith({
        issue_number: 23,
        labels: ['my-label'],
        owner: organizationName(),
        repo,
      })
      expect(result[0].name).toEqual('my-label')
      spy.mockRestore()
    })
  })
})
