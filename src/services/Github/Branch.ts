import {
  GitCreateRefResponseData,
  ReposGetBranchResponseData,
} from '@octokit/types'
import isUndefined from 'lodash/isUndefined'

import { client, readClient } from '@sr-services/Github/Client'
import {
  Branch,
  createGitBlob,
  createGitBranch,
  createGitCommit,
  createGitTree,
  Repository,
  TreeModes,
  TreeTypes,
} from '@sr-services/Github/Git'
import { getNextPullRequestNumber } from '@sr-services/Github/Repository'
import { organizationName } from '@sr-services/Inputs'

/**
 * Deletes the given branch via the Github API.
 *
 * @param {Repository} repo   The name of the repository that the branch belongs to.
 * @param {Branch}     branch The name of the branch to fetch.
 *
 * @returns {void}
 */
export const deleteBranch = async (
  repo: Repository,
  branch: Branch
): Promise<void> => {
  try {
    const response = await client.git.deleteRef({
      owner: organizationName(),
      repo,
      ref: `heads/${branch}`,
    })

    if (response.status !== 204) {
      throw new Error(
        `Couldn't delete branch '${branch}' - Github returned status ${response.status}`
      )
    }
  } catch (err) {
    if (err.message !== 'Branch not found') {
      throw err
    }
  }
}

/**
 * Fetches a branch from the Github API.
 *
 * @param {Repository} repo   The name of the repository that the branch belongs to.
 * @param {Branch}     branch The name of the branch to fetch.
 *
 * @returns {ReposGetBranchResponseData} The branch data.
 */
export const getBranch = async (
  repo: Repository,
  branch: Branch
): Promise<ReposGetBranchResponseData | undefined> => {
  try {
    const response = await readClient.repos.getBranch({
      owner: organizationName(),
      repo,
      branch,
    })
    return response.data
  } catch (err) {
    if (err.message === 'Branch not found') {
      return undefined
    }

    throw err
  }

  return undefined
}

export const createBranch = async (
  repo: Repository,
  baseBranchName: Branch,
  newBranchName: Branch,
  filePath: string,
  fileContent: string,
  commitMessage: string
): Promise<GitCreateRefResponseData> => {
  const baseBranch = await getBranch(repo, baseBranchName)
  if (isUndefined(baseBranch)) {
    throw new Error(`Base branch not found for repository '${repo}'`)
  }

  const prNumber = await getNextPullRequestNumber(repo)
  const blob = await createGitBlob(repo, fileContent)
  const treeData = [
    {
      path: filePath,
      mode: TreeModes.ModeFile,
      type: TreeTypes.Blob,
      sha: blob.sha,
    },
  ]
  const tree = await createGitTree(repo, treeData, baseBranch.commit.sha)

  const commit = await createGitCommit(
    repo,
    `[#${prNumber}] ${commitMessage}`,
    tree.sha,
    baseBranch.commit.sha
  )

  return createGitBranch(repo, newBranchName, commit.sha)
}
