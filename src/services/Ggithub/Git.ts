import {
  GitCreateBlobResponseData,
  GitCreateCommitResponseData,
  GitCreateRefResponseData,
  GitCreateTreeResponseData,
} from '@octokit/types'

import { OrganizationName } from '@sr-services/Constants'
import { client } from '@sr-services/Ggithub/Client'

export type Branch = string
export type Sha = string
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
 * @param {string} repo    The name of the repository that the blob will belong to.
 * @param {string} content The content to put in the blob.
 *
 * @returns {GitCreateBlobResponseData} The blob data.
 */
export const createGitBlob = async (
  repo: Repository,
  content: string
): Promise<GitCreateBlobResponseData> => {
  const response = await client.git.createBlob({
    owner: OrganizationName,
    repo,
    content,
  })

  return response.data
}

/**
 * Creates a new commit.
 *
 * @param {string} repo    The name of the repository that the commit will belong to.
 * @param {string} message The commit message.
 * @param {Sha}    tree    The tree to attach the commit to.
 * @param {Sha}    parent  The parent to attach the commit to.
 *
 * @returns {GitCreateCommitResponseData} The commit data.
 */
export const createGitCommit = async (
  repo: Repository,
  message: string,
  tree: Sha,
  parent: Sha
): Promise<GitCreateCommitResponseData> => {
  const response = await client.git.createCommit({
    owner: OrganizationName,
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
 * @param {string} repo   The name of the repository that the branch will belong to.
 * @param {Branch} branch The name of the branch to create.
 * @param {Sha}    sha    The commit sha to base the branch on.
 *
 * @returns {GitCreateRefResponseData} The branch data.
 */
export const createGitBranch = async (
  repo: Repository,
  branch: Branch,
  sha: Sha
): Promise<GitCreateRefResponseData> => {
  const response = await client.git.createRef({
    owner: OrganizationName,
    repo,
    ref: `refs/heads/${branch}`,
    sha,
  })

  return response.data
}

/**
 * Creates a new tree, which can be used to make a commit.
 *
 * @param {string} repo     The name of the repository that the branch will belong to.
 * @param {Tree[]} tree     The data to use when creating the tree.
 * @param {Sha}    baseTree The tree to base the new tree on.
 *
 * @returns {GitCreateTreeResponseData} The branch data.
 */
export const createGitTree = async (
  repo: Repository,
  tree: Tree[],
  baseTree: Sha
): Promise<GitCreateTreeResponseData> => {
  const response = await client.git.createTree({
    owner: OrganizationName,
    repo,
    tree,
    base_tree: baseTree,
  })

  return response.data
}
