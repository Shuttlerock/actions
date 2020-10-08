// https://github.com/steveukx/git-js#readme
// See https://github.com/actions/toolkit/tree/main/packages/github

import { info } from '@actions/core'

import { Repository } from '@sr-services/github/Git'

export const rebase = (
  owner: string,
  repo: Repository,
  head: string,
  base: string
): void => {
  // This is much harder than expected to get right - leaving a placeholder method for now.
  info(`Todo: rebasing ${owner}/${repo} ${base} → ${head}...`)
}
