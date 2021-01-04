import { info } from '@actions/core'

import { createReleasePullRequest, getRepository } from '@sr-services/Github'

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

  await createReleasePullRequest(email, repo)
}
