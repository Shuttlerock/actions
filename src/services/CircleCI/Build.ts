import { info } from '@actions/core'
import { Build } from 'circleci-api'

import { client, optionsForRepo } from '@sr-services/CircleCI/Client'

export const triggerBuildFor = async (repo: string, branch: string): Promise<Build> => {
  client
    .triggerBuildFor(branch, optionsForRepo(repo))
    .then((response) => {
      info(`${response}`)
      return response
    })
    .catch((err) => {
      throw new Error(
        `Failed to trigger CircleCI for ${repo}:${branch} (${err})`
      )
    })
    return {} as Build
}
