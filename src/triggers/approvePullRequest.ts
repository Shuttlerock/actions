import { error, info } from '@actions/core'
import isNil from 'lodash/isNil'

import { reviewPullRequest } from '@sr-services/Github'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/approvePullRequest.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "approvePullRequest", "param": "actions#344" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email     The email address of the user who requested the release be created.
 * @param {string} repoAndPr The name of the repository and the pull request number together (eg. 'actions#344').
 */
export const approvePullRequest = async (
  email: string,
  repoAndPr: string
): Promise<void> => {
  const [repositoryName, prStr] = repoAndPr.trim().split(/[\s#]+/)
  const prNumber = parseInt(prStr, 10)
  if (isNil(repositoryName) || isNil(prNumber)) {
    error(
      `Repository name and pull request number could not be extracted from '${repoAndPr}' - giving up`
    )
    return
  }

  info(`User ${email} requested approval of ${repositoryName}#${prNumber}...`)
  await reviewPullRequest(repositoryName, prNumber, 'APPROVE', ':thumbsup:')
  info(`Approved ${repositoryName}#${prNumber}`)
}
