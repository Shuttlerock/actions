import { Octokit } from '@octokit/rest'

import { GithubWriteToken } from '@sr-services/Constants'

export const client = new Octokit({ auth: GithubWriteToken })

export const clientForToken = (token: string): Octokit => {
  return new Octokit({ auth: token })
}
