import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
  OctokitResponse,
  ReposGetBranchResponseData,
} from '@octokit/types'

import * as Branch from '@sr-services/Github/Branch'
import { client, readClient } from '@sr-services/Github/Client'
import * as Git from '@sr-services/Github/Git'
import * as Repository from '@sr-services/Github/Repository'
import { organizationName } from '@sr-services/Inputs'
import { mockGithubBranch } from '@sr-tests/Mocks'

const repo = 'my-repo'
const branch = 'my-branch'

describe('Branch', () => {
  describe('getBranch', () => {
    interface GetBranchParams {
      owner: string
      repo: Git.Repository
      branch: Git.Branch
    }
    const fetchBranchParams = {
      owner: organizationName(),
      repo,
      branch,
    }

    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(readClient.repos, 'getBranch')
        .mockImplementation((_args?: GetBranchParams) =>
          Promise.resolve({
            data: mockGithubBranch,
          } as OctokitResponse<ReposGetBranchResponseData>)
        )
      const result = await Branch.getBranch(repo, branch)
      expect(spy).toHaveBeenCalledWith(fetchBranchParams)
      expect(result?.name).toEqual(branch)
      spy.mockRestore()
    })

    it("returns undefined if the branch can't be found", async () => {
      const spy = jest
        .spyOn(readClient.repos, 'getBranch')
        .mockImplementation((_args?: GetBranchParams) => {
          throw new Error('Branch not found')
        })
      const result = await Branch.getBranch(repo, branch)
      expect(spy).toHaveBeenCalledWith(fetchBranchParams)
      expect(result).toEqual(undefined)
      spy.mockRestore()
    })
  })

  describe('createBranch', () => {
    it('calls the Github API', async () => {
      const spyGetBranch = jest
        .spyOn(Branch, 'getBranch')
        .mockImplementation((_repo: Git.Repository, fetchBranch: Git.Branch) =>
          Promise.resolve({
            name: fetchBranch,
            commit: { sha: 'branch-sha' },
          } as ReposGetBranchResponseData)
        )

      const spyGetNextPullRequestNumber = jest
        .spyOn(Repository, 'getNextPullRequestNumber')
        .mockImplementation((_repo: Git.Repository) => Promise.resolve(3))

      const spyCreateGitBlob = jest
        .spyOn(Git, 'createGitBlob')
        .mockImplementation((_repo: Git.Repository, _fileContent: string) =>
          Promise.resolve({ sha: 'blob-sha' } as GitCreateBlobResponseData)
        )

      const spyCreateGitTree = jest
        .spyOn(Git, 'createGitTree')
        .mockImplementation(
          (_repo: Git.Repository, _tree: Git.Tree[], _sha: Git.Sha) =>
            Promise.resolve({ sha: 'tree-sha' } as GitCreateTreeResponseData)
        )

      const spyCreateGitCommit = jest
        .spyOn(Git, 'createGitCommit')
        .mockImplementation(
          (
            _repo: Git.Repository,
            _message: string,
            _treeSha: Git.Sha,
            _baseSha: Git.Sha
          ) =>
            Promise.resolve({
              sha: 'commit-sha',
            } as GitCreateCommitResponseData)
        )

      const spyCreateGitBranch = jest
        .spyOn(Git, 'createGitBranch')
        .mockImplementation(
          (_repo: Git.Repository, _branch: Git.Branch, _sha: Git.Sha) =>
            Promise.resolve({ ref: 'branch-ref' } as GitCreateRefResponseData)
        )

      const result = await Branch.createBranch(
        repo,
        'master',
        branch,
        {
          '.meta/ISSUE-236.md':
            'https://example.atlassian.net/browse/ISSUE-236',
        },
        '[ISSUE-236] [skip ci] Create pull request.'
      )

      expect(spyCreateGitBranch).toHaveBeenCalledWith(
        repo,
        branch,
        'commit-sha'
      )
      expect(result.ref).toEqual('branch-ref')

      spyGetBranch.mockRestore()
      spyGetNextPullRequestNumber.mockRestore()
      spyCreateGitBlob.mockRestore()
      spyCreateGitTree.mockRestore()
      spyCreateGitCommit.mockRestore()
      spyCreateGitBranch.mockRestore()
    })

    it("throws an error if the base branch can't be found", async () => {
      const spyGetBranch = jest
        .spyOn(Branch, 'getBranch')
        .mockImplementation((_repo: Git.Repository, _branch: Git.Branch) =>
          Promise.resolve(undefined)
        )

      await expect(
        Branch.createBranch(
          repo,
          'master',
          branch,
          {
            '.meta/ISSUE-236.md':
              'https://example.atlassian.net/browse/ISSUE-236',
          },
          '[ISSUE-236] [skip ci] Create pull request.'
        )
      ).rejects.toEqual(
        new Error("Base branch not found for repository 'my-repo'")
      )
      spyGetBranch.mockRestore()
    })
  })

  describe('deleteBranch', () => {
    interface DeleteBranchParams {
      owner: string
      repo: Git.Repository
      ref: string
    }
    const deleteBranchParams = {
      owner: organizationName(),
      repo,
      ref: `heads/${branch}`,
    }

    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(client.git, 'deleteRef')
        .mockImplementation((_args?: DeleteBranchParams) =>
          Promise.resolve({ status: 204 } as unknown as OctokitResponse<void>)
        )
      const result = await Branch.deleteBranch(repo, branch)
      expect(spy).toHaveBeenCalledWith(deleteBranchParams)
      expect(result).toEqual(undefined)
      spy.mockRestore()
    })

    it("returns undefined if the branch can't be found", async () => {
      const spy = jest
        .spyOn(client.git, 'deleteRef')
        .mockImplementation((_args?: DeleteBranchParams) => {
          throw new Error('Branch not found')
        })
      const result = await Branch.deleteBranch(repo, branch)
      expect(spy).toHaveBeenCalledWith(deleteBranchParams)
      expect(result).toEqual(undefined)
      spy.mockRestore()
    })
  })
})
