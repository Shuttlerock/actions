import { error, info } from '@actions/core'
import dateFormat from 'dateformat'
import isNil from 'lodash/isNil'

import {
  DevelopBranchName,
  GithubWriteUser,
  MasterbranchName,
} from '@sr-services/Constants'
import { compareCommits, getBranch, getRepository } from '@sr-services/Github'
import { debug } from '@sr-services/Log'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/createRelease.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "createRelease", "param": "nolan" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email          The email address of the user who requested the release be created.
 * @param {string} repositoryName The name of the repository to create a release for.
 */
export const createRelease = async (
  email: string,
  repositoryName: string
): Promise<void> => {
  info(`User ${email} requested a release for repository ${repositoryName}...`)

  info(`Checking if the repository '${repositoryName}' exists...`)
  const repo = await getRepository(repositoryName)

  const develop = await getBranch(repo.name, DevelopBranchName)
  if (isNil(develop)) {
    error(
      `Branch '${DevelopBranchName}' could not be found for repository ${repo.name} - giving up`
    )
    return
  }

  const master = await getBranch(repo.name, MasterbranchName)
  if (isNil(master)) {
    error(
      `Branch '${MasterbranchName}' could not be found for repository ${repo.name} - giving up`
    )
    return
  }

  info(
    `Checking if '${DevelopBranchName}' is ahead of '${MasterbranchName}' (${master.commit.sha}..${develop.commit.sha})`
  )
  const diff = await compareCommits(
    repo.name,
    master.commit.sha,
    develop.commit.sha
  )
  if (diff.total_commits === 0) {
    info(
      `Branch '${MasterbranchName}' already contains the latest release - nothing to do`
    )
    return
  }
  info(`Found ${diff.total_commits} commits to release`)

  const releaseBranchName = `${GithubWriteUser}/release-${dateFormat(
    new Date(),
    'yyyy-mm-dd-hhss'
  )}`
  info(`Looking for an existing release branch (${releaseBranchName})...`)
  const releaseBranch = await getBranch(repo.name, releaseBranchName)
  if (isNil(releaseBranch)) {
    info('Existing release branch not found - creating it...')
  } else {
    info('Release branch already exists')
  }

  debug(releaseBranchName)
  debug(releaseBranch)
}
