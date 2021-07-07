import { error, info } from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'

import {
  DependenciesLabel,
  GithubWriteUser,
  PleaseReviewLabel,
  PriorityHighLabel,
  PriorityLowLabel,
  PriorityMediumLabel,
  SecurityLabel,
} from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import {
  addLabels,
  assignOwners,
  assignReviewers,
  pullRequestUrl,
} from '@sr-services/Github'
import { githubWriteToken } from '@sr-services/Inputs'
import { sendErrorMessage, sendUserMessage } from '@sr-services/Slack'

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
const perform = async (
  payload: Schema.PullRequestLabeledEvent
): Promise<void> => {
  // Dependabot no longer gives us any inputs to work with. In this case we should just fail gracefully.
  // @see https://github.blog/changelog/2021-02-19-github-actions-workflows-triggered-by-dependabot-prs-will-run-with-read-only-permissions/
  if (isEmpty(githubWriteToken())) {
    info(
      'Organization name was not provided. Perhaps this is a dependabot PR? Giving up...'
    )
    return
  }

  const { label, pull_request: pullRequest, repository, sender } = payload

  if (sender.login === GithubWriteUser) {
    info(`This label was added by @${GithubWriteUser} - nothing to do`)
    return
  }

  const added = label?.name
  if (isNil(added)) {
    info('The label is empty - giving up')
    return
  }
  let labels = [added]

  const repo = await fetchRepository(repository.name)

  // If this is a security PR or a dependency update, we want to make sure there is an owner.
  if ([DependenciesLabel, SecurityLabel].includes(added)) {
    const owners = repo.leads.map((user: User) => user.github_username)
    if (owners.length > 0) {
      info(`Assigning owners (${owners.join(', ')})...`)
      await assignOwners(repository.name, pullRequest.number, owners)
    } else {
      info('No owners to assign')
    }
  }

  // If this is a security-related PR, assign a priority, and message the owners
  // asking them to confirm the priority.
  const isPrioritized =
    pullRequest.labels.filter(lbl =>
      [PriorityHighLabel, PriorityMediumLabel, PriorityLowLabel].includes(
        lbl.name
      )
    ).length > 0
  if (added === SecurityLabel && !isPrioritized) {
    labels = [...labels, PriorityHighLabel]
    info('Prioritizing the PR...')
    const url = pullRequestUrl(repository.name, pullRequest.number)
    const link = `*<${url}|${repository.name}#${pullRequest.number} (${pullRequest.title})>*`
    const message =
      `:warning: Please review the security issue ${link} and assign a priority of either ` +
      `\`${PriorityHighLabel}\` (high), \`${PriorityMediumLabel}\` (medium) or \`${PriorityLowLabel}\` (low). ` +
      'SLAs apply to this pull request, and we need to resolve it in a timely manner.'

    await Promise.all(
      repo.leads.map(async (user: User) => {
        await sendUserMessage(user.slack_id, message)
        info(
          `Sent a message to ${user.email} requesting that the priority be checked`
        )
      })
    )

    if (repo.leads.length === 0) {
      await sendErrorMessage(
        `Repository ${repository.name} has no technical lead assigned to prioritize security issues.`
      )
    }
  }

  // If this is a dependabot PR, we want to start review straight away.
  if (added === DependenciesLabel) {
    info('This looks like a dependency update - adding reviewers...')
    const reviewers = repo.reviewers.map((user: User) => user.github_username)
    if (reviewers.length > 0) {
      info(`Assigning reviewers (${reviewers.join(', ')})...`)
      await assignReviewers(repository.name, pullRequest.number, reviewers)
    } else {
      info('No reviewers to assign')
    }

    labels = [...labels, PleaseReviewLabel]
  }

  await addLabels(repository.name, pullRequest.number, labels)
}

/**
 * Wrapper for the perform method, which allows us to catch fatal errors that we don't care about.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestLabeled = async (
  payload: Schema.PullRequestLabeledEvent
): Promise<void> => {
  try {
    await perform(payload)
  } catch (err) {
    if (err.message.match(/^Input required and not supplied: /)) {
      // See https://shuttlerock.atlassian.net/browse/SECURITY-436
      // Do nothing here - this seems to be a bug in Github Actions, and we don't
      // want to cause a test suite failure for the sake of adding a label.
      error('Missing Github secret:')
      error(err.message)
    } else {
      throw err
    }
  }
}
