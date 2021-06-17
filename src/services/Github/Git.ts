import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
  GitGetCommitResponseData,
} from '@octokit/types'

import { client, readClient } from '@sr-services/Github/Client'
import { organizationName } from '@sr-services/Inputs'

export type Branch = string

export type Sha = string

export interface Commit {
  author: {
    login: string
  }
  node_id: string
  sha: Sha
  commit: {
    message: string
    tree: {
      sha: Sha
    }
  }
}

export type Repository = string

// Mode is one of:
// - 100644: file (blob)
// - 100755: executable (blob)
// - 040000: subdirectory (tree).
type TreeMode = '100644' | '100755' | '040000' | '160000' | '120000'
export const TreeModes = {
  ModeFile: '100644' as TreeMode,
  ModeExe: '100755' as TreeMode,
  ModeDirectory: '040000' as TreeMode,
}

type TreeType = 'blob' | 'commit' | 'tree'
export const TreeTypes = {
  Blob: 'blob' as TreeType,
  Commit: 'commit' as TreeType,
  Tree: 'tree' as TreeType,
}

// Only ONE of 'sha' or 'content' should be provided.
export interface Tree {
  content?: string
  mode?: TreeMode
  type?: TreeType
  path?: string
  sha?: Sha | null
}

/**
 * Creates a new blob, which can be used to make a tree.
 *
 * @param {Repository} repo    The name of the repository that the blob will belong to.
 * @param {string}     content The content to put in the blob.
 * @returns {GitCreateBlobResponseData} The blob data.
 */
export const createGitBlob = async (
  repo: Repository,
  content: string
): Promise<GitCreateBlobResponseData> => {
  const response = await client().git.createBlob({
    owner: organizationName(),
    repo,
    content,
  })

  return response.data
}

/**
 * Creates a new commit.
 *
 * @param {Repository} repo    The name of the repository that the commit will belong to.
 * @param {string}     message The commit message.
 * @param {Sha}        tree    The tree to attach the commit to.
 * @param {Sha}        parent  The parent to attach the commit to.
 * @returns {GitCreateCommitResponseData} The commit data.
 */
export const createGitCommit = async (
  repo: Repository,
  message: string,
  tree: Sha,
  parent: Sha
): Promise<GitCreateCommitResponseData> => {
  const response = await client().git.createCommit({
    owner: organizationName(),
    repo,
    message,
    tree,
    parents: [parent],
  })

  return response.data
}

/**
 * Creates a new branch.
 *
 * @param {Repository} repo   The name of the repository that the branch will belong to.
 * @param {Branch}     branch The name of the branch to create.
 * @param {Sha}        sha    The commit sha to base the branch on.
 * @returns {GitCreateRefResponseData} The branch data.
 */
export const createGitBranch = async (
  repo: Repository,
  branch: Branch,
  sha: Sha
): Promise<GitCreateRefResponseData> => {
  const response = await client().git.createRef({
    owner: organizationName(),
    repo,
    ref: `refs/heads/${branch}`,
    sha,
  })

  return response.data
}

/**
 * Creates a new tree, which can be used to make a commit.
 *
 * @param {Repository} repo     The name of the repository that the branch will belong to.
 * @param {Tree[]}     tree     The data to use when creating the tree.
 * @param {Sha}        baseTree The tree to base the new tree on.
 * @returns {GitCreateTreeResponseData} The branch data.
 */
export const createGitTree = async (
  repo: Repository,
  tree: Tree[],
  baseTree: Sha
): Promise<GitCreateTreeResponseData> => {
  const response = await client().git.createTree({
    owner: organizationName(),
    repo,
    tree,
    base_tree: baseTree,
  })

  return response.data
}

/**
 * Returns the commit with the given sha.
 *
 * @param {Repository} repo The name of the repository whose commit we want to fetch.
 * @param {Sha}        sha  The sha hash of the commit.
 * @returns {GitGetCommitResponseData} The commit data.
 */
export const getCommit = async (
  repo: Repository,
  sha: Sha
): Promise<GitGetCommitResponseData> => {
  const response = await readClient().git.getCommit({
    owner: organizationName(),
    repo,
    commit_sha: sha,
  })
  return response.data
}
