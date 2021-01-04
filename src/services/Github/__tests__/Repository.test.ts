import {
  OctokitResponse,
  PullsListResponseData,
  ReposCompareCommitsResponseData,
  ReposGetResponseData,
} from '@octokit/types'

import { readClient } from '@sr-services/Github/Client'
import { Repository, Sha } from '@sr-services/Github/Git'
import {
  compareCommits,
  getNextPullRequestNumber,
  getRepository,
} from '@sr-services/Github/Repository'
import { organizationName } from '@sr-services/Inputs'
import { mockGitCommit, mockGithubRepository } from '@sr-tests/Mocks'

const repo = mockGithubRepository.name

describe('Repository', () => {
  describe('compareCommits', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(readClient.repos, 'compareCommits')
        .mockImplementation(
          (_args?: { base: Sha; head: Sha; owner: string; repo: Repository }) =>
            Promise.resolve({
              data: { commits: [mockGitCommit] },
            } as OctokitResponse<ReposCompareCommitsResponseData>)
        )
      const base = 'base-sha'
      const head = 'head-sha'
      const result = await compareCommits(repo, base, head)
      expect(spy).toHaveBeenCalledWith({
        base,
        head,
        owner: organizationName(),
        repo,
      })
      expect(result.commits[0].node_id).toEqual('12345')
      spy.mockRestore()
    })
  })

  describe('getNextPullRequestNumber', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(readClient.pulls, 'list')
        .mockImplementation(
          (_args?: {
            direction?: string
            owner: string
            page?: number
            per_page?: number
            repo: Repository
            sort?: string
            state?: string
          }) =>
            Promise.resolve({
              data: [
                {
                  number: 1234,
                },
              ],
            } as OctokitResponse<PullsListResponseData>)
        )
      const result = await getNextPullRequestNumber(repo)
      expect(spy).toHaveBeenCalledWith({
        direction: 'desc',
        owner: organizationName(),
        page: 1,
        per_page: 1,
        repo,
        sort: 'created',
        state: 'all',
      })
      expect(result).toEqual(1235)
    })
  })

  describe('getRepository', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(readClient.repos, 'get')
        .mockImplementation((_args?: { owner: string; repo: Repository }) =>
          Promise.resolve({
            data: mockGithubRepository,
          } as OctokitResponse<ReposGetResponseData>)
        )
      const result = await getRepository(repo)
      expect(spy).toHaveBeenCalledWith({ owner: organizationName(), repo })
      expect(result.name).toEqual(repo)
      spy.mockRestore()
    })
  })
})
