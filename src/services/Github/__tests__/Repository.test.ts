import {
  OctokitResponse,
  PullsListResponseData,
  ReposGetResponseData,
} from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/Github/Client'
import { Repository } from '@sr-services/Github/Git'
import {
  getNextPullRequestNumber,
  getRepository,
} from '@sr-services/Github/Repository'
import { mockGithubRepository } from '@sr-tests/Mocks'

const repo = mockGithubRepository.name

describe('Repository', () => {
  describe('getNextPullRequestNumber', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(client.pulls, 'list')
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
        owner: OrganizationName,
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
        .spyOn(client.repos, 'get')
        .mockImplementation((_args?: { owner: string; repo: Repository }) =>
          Promise.resolve({
            data: mockGithubRepository,
          } as OctokitResponse<ReposGetResponseData>)
        )
      const result = await getRepository(repo)
      expect(spy).toHaveBeenCalledWith({ owner: OrganizationName, repo })
      expect(result.name).toEqual(repo)
      spy.mockRestore()
    })
  })
})
