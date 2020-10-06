import { Octokit } from '@octokit/rest'

import { GithubWriteToken } from '@sr-services/Constants'

export const client = new Octokit({ auth: GithubWriteToken })
