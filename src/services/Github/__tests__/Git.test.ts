import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
  OctokitResponse,
} from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/Github/Client'
import {
  Branch,
  createGitBlob,
  createGitBranch,
  createGitCommit,
  createGitTree,
  Repository,
  Sha,
  Tree,
  TreeModes,
  TreeTypes,
} from '@sr-services/Github/Git'

const repo = 'my-repo'

describe('Git', () => {
  describe('createGitBlob', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(client.git, 'createBlob')
        .mockImplementation(
          (_args?: { owner: string; repo: Repository; content: string }) =>
            Promise.resolve({
              data: { sha: 'blob-sha' },
            } as OctokitResponse<GitCreateBlobResponseData>)
        )
      const result = await createGitBlob(repo, 'my-content')
      expect(spy).toHaveBeenCalledWith({
        owner: OrganizationName,
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
        .spyOn(client.git, 'createCommit')
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
        owner: OrganizationName,
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
        .spyOn(client.git, 'createRef')
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
        owner: OrganizationName,
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
        .spyOn(client.git, 'createTree')
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
        owner: OrganizationName,
        repo,
        tree,
        base_tree: 'my-sha',
      })
      expect(result.sha).toEqual('tree-sha')
      spy.mockRestore()
    })
  })
})
