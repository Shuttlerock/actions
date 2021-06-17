import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
  GitGetCommitResponseData,
  OctokitResponse,
} from '@octokit/types'

import {
  Branch,
  createGitBlob,
  createGitBranch,
  createGitCommit,
  createGitTree,
  getCommit,
  Repository,
  Sha,
  Tree,
  TreeModes,
  TreeTypes,
} from '@sr-services/Github/Git'
import { organizationName } from '@sr-services/Inputs'
import { mockGithubClient, mockReadClient } from '@sr-tests/Mocks'

const repo = 'my-repo'

jest.mock('@sr-services/Github/Client', () => ({
  client: () => mockGithubClient,
  readClient: () => mockReadClient,
}))

describe('Git', () => {
  describe('createGitBlob', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(mockGithubClient.git, 'createBlob')
        .mockImplementation(
          (_args?: { owner: string; repo: Repository; content: string }) =>
            Promise.resolve({
              data: { sha: 'blob-sha' },
            } as OctokitResponse<GitCreateBlobResponseData>)
        )
      const result = await createGitBlob(repo, 'my-content')
      expect(spy).toHaveBeenCalledWith({
        owner: organizationName(),
        repo,
        content: 'my-content',
      })
      expect(result.sha).toEqual('blob-sha')
      spy.mockRestore()
    })
  })

  describe('createGitCommit', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(mockGithubClient.git, 'createCommit')
        .mockImplementation(
          (_args?: {
            owner: string
            repo: Repository
            message: string
            tree: Sha
            parents: Sha[]
          }) =>
            Promise.resolve({
              data: { sha: 'commit-sha' },
            } as OctokitResponse<GitCreateCommitResponseData>)
        )
      const result = await createGitCommit(
        repo,
        'my-message',
        'master',
        'parent-sha'
      )
      expect(spy).toHaveBeenCalledWith({
        owner: organizationName(),
        repo,
        message: 'my-message',
        tree: 'master',
        parents: ['parent-sha'],
      })
      expect(result.sha).toEqual('commit-sha')
      spy.mockRestore()
    })
  })

  describe('createGitBranch', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(mockGithubClient.git, 'createRef')
        .mockImplementation(
          (_args?: {
            owner: string
            repo: Repository
            ref: Branch
            sha: Sha
          }) =>
            Promise.resolve({
              data: { ref: 'branch-ref' },
            } as OctokitResponse<GitCreateRefResponseData>)
        )
      const result = await createGitBranch(repo, 'my-branch', 'my-sha')
      expect(spy).toHaveBeenCalledWith({
        owner: organizationName(),
        repo,
        ref: 'refs/heads/my-branch',
        sha: 'my-sha',
      })
      expect(result.ref).toEqual('branch-ref')
      spy.mockRestore()
    })
  })

  describe('createGitTree', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(mockGithubClient.git, 'createTree')
        .mockImplementation(
          (_args?: {
            owner: string
            repo: Repository
            tree: Tree[]
            base_tree?: Sha
          }) =>
            Promise.resolve({
              data: { sha: 'tree-sha' },
            } as OctokitResponse<GitCreateTreeResponseData>)
        )
      const tree = [
        {
          path: '/some/path',
          mode: TreeModes.ModeFile,
          type: TreeTypes.Blob,
          sha: 'tree-sha',
        },
      ]
      const result = await createGitTree(repo, tree, 'my-sha')
      expect(spy).toHaveBeenCalledWith({
        owner: organizationName(),
        repo,
        tree,
        base_tree: 'my-sha',
      })
      expect(result.sha).toEqual('tree-sha')
      spy.mockRestore()
    })
  })

  describe('getCommit', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(mockReadClient.git, 'getCommit')
        .mockImplementation(
          (_args?: { owner: string; repo: Repository; commit_sha: string }) =>
            Promise.resolve({
              data: { message: 'Fix the widget' },
            } as unknown as OctokitResponse<GitGetCommitResponseData>)
        )
      const result = await getCommit(repo, 'my-sha')
      expect(spy).toHaveBeenCalledWith({
        owner: organizationName(),
        repo,
        commit_sha: 'my-sha',
      })
      expect(result.message).toEqual('Fix the widget')
      spy.mockRestore()
    })
  })
})
