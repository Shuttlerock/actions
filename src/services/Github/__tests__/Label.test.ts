import {
  IssuesAddLabelsResponseData,
  IssuesSetLabelsResponseData,
  OctokitResponse,
} from '@octokit/types'

import { InProgressLabel, PleaseReviewLabel } from '@sr-services/Constants'
import * as Client from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'
import { addLabels, setLabels } from '@sr-services/Github/Label'
import * as PullRequest from '@sr-services/Github/PullRequest'
import { organizationName } from '@sr-services/Inputs'
import {
  mockGithubPullRequest,
  mockIssuesSetLabelsResponseData,
} from '@sr-tests/Mocks'

jest.mock('@sr-services/Github/PullRequest', () => ({
  getPullRequest: jest.fn(),
}))

const repo = 'my-repo'

describe('PullRequest', () => {
  describe('addLabels', () => {
    let githubGetPullRequestSpy: jest.SpyInstance
    let githubSetLabelsSpy: jest.SpyInstance

    beforeEach(() => {
      githubGetPullRequestSpy = jest
        .spyOn(PullRequest, 'getPullRequest')
        .mockImplementation((_repo: Repository, _number: number) =>
          Promise.resolve(mockGithubPullRequest)
        )
      githubSetLabelsSpy = jest
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
            } as OctokitResponse<IssuesAddLabelsResponseData>)
        )
    })

    afterEach(() => {
      githubGetPullRequestSpy.mockRestore()
      githubSetLabelsSpy.mockRestore()
    })

    it('calls the Github API', async () => {
      const result = await addLabels(repo, 23, ['my-label'])
      expect(githubSetLabelsSpy).toHaveBeenCalledWith({
        issue_number: 23,
        labels: [InProgressLabel, 'my-label'],
        owner: organizationName(),
        repo,
      })
      expect(result[0].name).toEqual('my-label')
    })

    it('removes mutually exlusive labels', async () => {
      await addLabels(repo, 23, [PleaseReviewLabel])
      expect(githubSetLabelsSpy).toHaveBeenCalledWith({
        issue_number: 23,
        labels: [PleaseReviewLabel],
        owner: organizationName(),
        repo,
      })
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
