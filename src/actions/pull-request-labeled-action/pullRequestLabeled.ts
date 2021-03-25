import { info } from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'
import isNil from 'lodash/isNil'

import {
  DependenciesLabel,
  GithubWriteUser,
  PleaseReviewLabel,
  SecurityLabel,
} from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import { addLabels, assignOwners, assignReviewers } from '@sr-services/Github'

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestLabeled = async (
  payload: Schema.PullRequestLabeledEvent
): Promise<void> => {
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

  if (![DependenciesLabel, SecurityLabel].includes(added)) {
    info(`No action needed for the label '${added}'`)
    return
  }

  const repo = await fetchRepository(repository.name)

  // If this is a security PR or a dependency update, we want to make sure there is an owner.
  const owners = repo.leads.map((user: User) => user.github_username)
  if (owners.length > 0) {
    info(`Assigning owners (${owners.join(', ')})...`)
    await assignOwners(repository.name, pullRequest.number, owners)
  } else {
    info('No owners to assign')
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

    await addLabels(repository.name, pullRequest.number, [
      added,
      PleaseReviewLabel,
    ])
  }
}
