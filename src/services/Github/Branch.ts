import { info } from '@actions/core'
import {
  GitCreateRefResponseData,
  ReposGetBranchResponseData,
} from '@octokit/types'
import isNil from 'lodash/isNil'
import isUndefined from 'lodash/isUndefined'

import { MainBranchName, MasterBranchName } from '@sr-services/Constants'
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
 * @returns {void}
 */
export const deleteBranch = async (
  repo: Repository,
  branch: Branch
): Promise<void> => {
  try {
    const response = await client().git.deleteRef({
      owner: organizationName(),
      repo,
      ref: `heads/${branch}`,
    })

    if (response.status !== 204) {
      throw new Error(
        `Couldn't delete branch '${branch}' - Github returned status ${response.status.toString()}`
      )
    }
  } catch (err) {
    if ((err as Error).message !== 'Branch not found') {
      throw err
    }
  }
}

/**
 * Fetches a branch from the Github API.
 *
 * @param {Repository} repo   The name of the repository that the branch belongs to.
 * @param {Branch}     branch The name of the branch to fetch.
 * @returns {ReposGetBranchResponseData} The branch data.
 */
export const getBranch = async (
  repo: Repository,
  branch: Branch
): Promise<ReposGetBranchResponseData | undefined> => {
  try {
    const response = await readClient().repos.getBranch({
      owner: organizationName(),
      repo,
      branch,
    })
    return response.data
  } catch (err) {
    if ((err as Error).message === 'Branch not found') {
      return undefined
    }

    throw err
  }

  return undefined
}

/**
 * Looks for an appropriately named 'master' or 'main' branch for the given repository.
 *
 * @param {Repository} repoName The name of the repository whose master branch we want to find.
 * @returns {ReposGetBranchResponseData | void} The pull request, if it exists.
 */
export const getMasterBranch = async (
  repoName: Repository
): Promise<ReposGetBranchResponseData | undefined> => {
  info(`Looking for a '${MasterBranchName}' branch...`)
  let master
  try {
    master = await getBranch(repoName, MasterBranchName)
  } catch {}

  if (isNil(master)) {
    // More recent projects use 'main' rather than 'master'.
    info(
      `Branch '${MasterBranchName}' could not be found for repository ${repoName} - trying ${MainBranchName}...`
    )
    try {
      master = await getBranch(repoName, MainBranchName)
    } catch {}
  }

  if (isNil(master)) {
    return undefined
  }

  return master
}

/**
 * Creates a branch vis the Github API.
 *
 * @param {Repository} repo           The name of the repository that the branch will belong to.
 * @param {Branch}     baseBranchName The name of the base branch to branch off.
 * @param {Branch}     newBranchName  The name of the branch to create.
 * @param {object}     fileContents   A map of file paths to file contents, which will be committed to the branch.
 * @param {string}     commitMessage  The text to use as the commit message.
 * @returns {GitCreateRefResponseData} The new branch data.
 */
export const createBranch = async (
  repo: Repository,
  baseBranchName: Branch,
  newBranchName: Branch,
  fileContents: { [key: string]: string },
  commitMessage: string
): Promise<GitCreateRefResponseData> => {
  const baseBranch = await getBranch(repo, baseBranchName)
  if (isUndefined(baseBranch)) {
    throw new Error(`Base branch not found for repository '${repo}'`)
  }

  const prNumber = await getNextPullRequestNumber(repo)

  const treeData = await Promise.all(
    Object.entries(fileContents).map(async ([path, content]) => {
      const blob = await createGitBlob(repo, content)
      return {
        path,
        mode: TreeModes.ModeFile,
        type: TreeTypes.Blob,
        sha: blob.sha,
      }
    })
  )

  const tree = await createGitTree(repo, treeData, baseBranch.commit.sha)

  const commit = await createGitCommit(
    repo,
    `[#${prNumber}] ${commitMessage}`,
    tree.sha,
    baseBranch.commit.sha
  )

  return createGitBranch(repo, newBranchName, commit.sha)
}
