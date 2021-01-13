import { info } from '@actions/core'
import { EventPayloads } from '@octokit/webhooks'

import {
  DependenciesLabel,
  GithubWriteUser,
  PleaseReviewLabel,
} from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import { addLabels, assignReviewers } from '@sr-services/Github'

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestLabeled = async (
  payload: EventPayloads.WebhookPayloadPullRequest
): Promise<void> => {
  const { label, pull_request: pullRequest, repository, sender } = payload

  if (sender.login === GithubWriteUser) {
    info(`This label was added by @${GithubWriteUser} - nothing to do`)
    return
  }

  let added = [label?.name as string] // We know we have a label for this event.

  // If this is a dependabot PR, we want to start review straight away.
  if (added[0] === DependenciesLabel) {
    info('This looks like a dependency update - adding reviewers...')
    added = [...added, PleaseReviewLabel]
    const repo = await fetchRepository(repository.name)
    const reviewers = repo.reviewers.map((user: User) => user.github_username)
    if (reviewers.length > 0) {
      info(`Assigning reviewers (${reviewers.join(', ')})...`)
      await assignReviewers(repository.name, pullRequest.number, reviewers)
    } else {
      info('No reviewers to assign')
    }
  }

  await addLabels(repository.name, pullRequest.number, added)
}
