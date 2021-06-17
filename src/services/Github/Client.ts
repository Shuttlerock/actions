import { Octokit } from '@octokit/rest'

import { githubReadToken, githubWriteToken } from '@sr-services/Inputs'

export const client = (): Octokit => new Octokit({ auth: githubWriteToken() })

export const readClient = (): Octokit =>
  new Octokit({ auth: githubReadToken() })

export const clientForToken = (token: string): Octokit => {
  return new Octokit({ auth: token })
}
