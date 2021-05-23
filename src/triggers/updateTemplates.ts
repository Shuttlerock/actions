import { error, info } from '@actions/core'
import {
  ReposGetBranchResponseData,
  ReposGetResponseData,
} from '@octokit/types'
import { readFileSync } from 'fs'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'

import {
  PleaseReviewLabel,
  TemplateUpdateBranchName,
} from '@sr-services/Constants'
import {
  fetchCredentials,
  fetchRepository,
  User,
} from '@sr-services/Credentials'
import {
  assignOwners,
  assignReviewers,
  createBranch,
  createPullRequest,
  deleteBranch,
  getBranch,
  getRepository,
  pullRequestUrl,
  setLabels,
} from '@sr-services/Github'
import { githubWriteToken } from '@sr-services/Inputs'
import { reportError, reportInfo, sendUserMessage } from '@sr-services/Slack'

/**
 * Looks for an existing branch for a release, and creates one if it doesn't already exist.
 *
 * @param {ReposGetResponseData} repo The repository that the branch will belong to.
 * @returns {ReposGetBranchResponseData} The branch data.
 */
const createTemplateBranch = async (
  repo: ReposGetResponseData
): Promise<ReposGetBranchResponseData> => {
  info(
    `Looking for an existing template update branch (${TemplateUpdateBranchName})...`
  )
  let branch = await getBranch(repo.name, TemplateUpdateBranchName)
  if (isNil(branch)) {
    info('Existing template update branch not found - creating it...')

    const pullRequestTemplate = readFileSync(
      '.github/PULL_REQUEST_TEMPLATE.md'
    ).toString('utf8')
    await createBranch(
      repo.name,
      repo.default_branch,
      TemplateUpdateBranchName,
      {
        '.github/PULL_REQUEST_TEMPLATE.md': pullRequestTemplate,
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
  return createTemplateBranch(repo)
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

  await createTemplateBranch(repo)

  // Todo - check if the file(s) have actually changed by diffing the branch with the target via the API.

  info('Creating a pull request...')
  const pullRequest = await createPullRequest(
    repo.name,
    repo.default_branch,
    TemplateUpdateBranchName,
    '[devops] Update repository configuration',
    'Update repository configuration to the latest defaults.',
    githubWriteToken(),
    { draft: false }
  )

  if (isNil(pullRequest)) {
    message = `An unknown error occurred while creating a release pull request for repository '${repo.name}'`
    return reportError(credentials.slack_id, message)
  }

  // Assign someone, if no-one has been assigned yet.
  if (isEmpty(pullRequest.assignees)) {
    if (isNil(credentials.github_username)) {
      info(
        `Credentials for ${email} don't have a Github account linked, so we can't assign an owner`
      )
    } else {
      info(`Assigning @${credentials.github_username} as the owner...`)
      await assignOwners(repo.name, pullRequest.number, [
        credentials.github_username,
      ])
    }
  }

  info('Fetching repository settings...')
  try {
    const repoSettings = await fetchRepository(repo.name)
    const reviewers = repoSettings.reviewers.map(
      (user: User) => user.github_username
    )
    if (reviewers.length > 0) {
      info(`Assigning reviewers (${reviewers.join(', ')})...`)
      await assignReviewers(repo.name, pullRequest.number, reviewers)
    }
  } catch (err) {
    error(
      "Couldn't find repository settings, so no reviewers will be assigned."
    )
  }

  // Add labels, if the PR has not been labeled yet.
  if (isEmpty(pullRequest.labels)) {
    info(`Adding the label '${PleaseReviewLabel}'...`)
    await setLabels(repo.name, pullRequest.number, [PleaseReviewLabel])
  }

  return reportInfo(
    credentials.slack_id,
    `Here's your template update PR: *<${pullRequestUrl(
      repo.name,
      pullRequest.number
    )}|${repo.name}#${pullRequest.number}>*`
  )
}
