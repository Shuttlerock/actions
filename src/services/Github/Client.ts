import { Octokit } from '@octokit/rest'

import { githubReadToken, githubWriteToken } from '@sr-services/Constants'

export const client = new Octokit({ auth: githubWriteToken() })

export const readClient = new Octokit({ auth: githubReadToken() })

export const clientForToken = (token: string): Octokit => {
  return new Octokit({ auth: token })
}
