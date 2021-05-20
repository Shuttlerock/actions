import { error, info } from '@actions/core'
import {
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import isNil from 'lodash/isNil'

import { TemplateUpdateBranchName } from '@sr-services/Constants'
import { fetchCredentials } from '@sr-services/Credentials'
import {
  createBranch,
  deleteBranch,
  getBranch,
  getRepository,
} from '@sr-services/Github'
import { sendUserMessage } from '@sr-services/Slack'

/**
 * Sends an error to the given Slack account, and logs it to Github actions.
 *
 * @param {string} slackId The Slack user ID of the person to send the error message to.
 * @param {string} message The message to send.
 * @returns {void}
 */
const reportError = async (slackId: string, message: string) => {
  await sendUserMessage(slackId, message)
  error(message)
  return undefined
}

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {ReposGetResponseData} repo The repository that the branch will belong to.
 * @returns {ReposGetBranchResponseData} The branch data.
 */
const ensureBranch = async (
  repo: ReposGetResponseData
): Promise<ReposGetBranchResponseData> => {
  info(
    `Looking for an existing template update branch (${TemplateUpdateBranchName})...`
  )
  let branch = await getBranch(repo.name, TemplateUpdateBranchName)
  if (isNil(branch)) {
    info('Existing template update branch not found - creating it...')

    await createBranch(
      repo.name,
      repo.default_branch,
      TemplateUpdateBranchName,
      {
        '.github/PULL_REQUEST_TEMPLATE.md': 'PR Template contents',
        '.github/test.md': 'test contents',
      },
      '[skip ci] [skip netlify] Update templates.'
    )

    // This is inefficient, but we look up the branch we just created to keep types consistent.
    branch = await getBranch(repo.name, TemplateUpdateBranchName)
    if (isNil(branch)) {
      throw new Error(
        `Branch '${repo.default_branch}' failed to be created for repository ${repo.name}`
      )
    }

    return branch
  }

  info(
    'The template update branch already exists, but is out of date - re-creating it...'
  )
  await deleteBranch(repo.name, TemplateUpdateBranchName)
  return ensureBranch(repo)
}

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/updateTemplates.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "updateTemplates", "param": "compliance" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email          The email address of the user who will own the pull request.
 * @param {string} repositoryName The name of the repository whose templates we want to update.
 * @returns {void}
 */
export const updateTemplates = async (
  email: string,
  repositoryName: string
): Promise<void> => {
  info(
    `User ${email} requested an update of templates for the repository ${repositoryName}...`
  )
  info(`Fetching credentials for user '${email}'...`)
  const credentials = await fetchCredentials(email)

  info(`Checking if the repository '${repositoryName}' exists...`)
  const repo = await getRepository(repositoryName)

  let message = `Creating a pull request to update templates for *<${repo.html_url}|${repo.name}>*...`
  await sendUserMessage(credentials.slack_id, message)

  const developBranch = await getBranch(repo.name, repo.default_branch)
  if (isNil(developBranch)) {
    message = `Branch '${repo.default_branch}' could not be found for repository ${repo.name} - giving up`
    return reportError(credentials.slack_id, message)
  }

  await ensureBranch(repo)

  // TODO: add the requester as a reviewer to each PR.

  return undefined
}
