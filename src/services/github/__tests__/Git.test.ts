import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
  OctokitResponse,
} from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/github/Client'
import * as Git from '@sr-services/github/Git'

const repo = 'my-repo'

describe('Git', () => {
  describe('createGitBlob', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(client.git, 'createBlob')
        .mockImplementation(
          (_args?: { owner: string; repo: Git.Repository; content: string }) =>
            Promise.resolve({
              data: { sha: 'blob-sha' },
            } as OctokitResponse<GitCreateBlobResponseData>)
        )
      const result = await Git.createGitBlob(repo, 'my-content')
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
            repo: Git.Repository
            message: string
            tree: Git.Sha
            parents: Git.Sha[]
          }) =>
            Promise.resolve({
              data: { sha: 'commit-sha' },
            } as OctokitResponse<GitCreateCommitResponseData>)
        )
      const result = await Git.createGitCommit(
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
            repo: Git.Repository
            ref: Git.Branch
            sha: Git.Sha
          }) =>
            Promise.resolve({
              data: { ref: 'branch-ref' },
            } as OctokitResponse<GitCreateRefResponseData>)
        )
      const result = await Git.createGitBranch(repo, 'my-branch', 'my-sha')
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
            repo: Git.Repository
            tree: Git.Tree[]
            base_tree?: Git.Sha
          }) =>
            Promise.resolve({
              data: { sha: 'tree-sha' },
            } as OctokitResponse<GitCreateTreeResponseData>)
        )
      const tree = [
        {
          path: '/some/path',
          mode: Git.TreeModes.ModeFile,
          type: Git.TreeTypes.Blob,
          sha: 'tree-sha',
        },
      ]
      const result = await Git.createGitTree(repo, tree, 'my-sha')
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
