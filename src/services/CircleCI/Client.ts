import { CircleCI, CircleCIOptions, CircleRequest, GitType } from "circleci-api";

import { circleCIToken, organizationName } from '@sr-services/Inputs'

export const defaultOptions: CircleCIOptions = {
  token: circleCIToken(),
}

export const optionsForRepo = (repo: string): CircleRequest => {
  return {
    token: circleCIToken(),
    vcs: {
      type: GitType.GITHUB,
      owner: organizationName(),
      repo,
    },
    options: {
      branch: 'master',
    },
  }
}

export const client = new CircleCI(defaultOptions)
