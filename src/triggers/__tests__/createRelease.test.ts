import { ReposGetResponseData } from '@octokit/types'

import * as Github from '@sr-services/Github'
import { mockGithubRepository } from '@sr-tests/Mocks'
import { createRelease } from '@sr-triggers/createRelease'

jest.mock('@sr-services/Github', () => ({
  createReleasePullRequest: jest.fn(),
  getRepository: jest.fn(),
}))

const email = 'user@example.com'

describe('createRelease', () => {
  let createReleasePullRequest: jest.SpyInstance
  let getRepository: jest.SpyInstance

  beforeEach(() => {
    createReleasePullRequest = jest
      .spyOn(Github, 'createReleasePullRequest')
      .mockImplementation((_email: string, _repo: ReposGetResponseData) =>
        Promise.resolve(undefined)
      )
    getRepository = jest
      .spyOn(Github, 'getRepository')
      .mockImplementation((_name: string) =>
        Promise.resolve(mockGithubRepository)
      )
  })

  afterEach(() => {
    createReleasePullRequest.mockRestore()
    getRepository.mockRestore()
  })

  it('calls the release creation service', async () => {
    await createRelease(email, mockGithubRepository.name)
    expect(getRepository).toHaveBeenCalled()
    expect(createReleasePullRequest).toHaveBeenCalledWith(
      email,
      mockGithubRepository
    )
  })
})
