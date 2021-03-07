import { info } from '@actions/core'
import Schema from '@octokit/webhooks-definitions/schema'

import { PassedReviewLabel } from '@sr-services/Constants'
import { fetchRepository, User } from '@sr-services/Credentials'
import { addLabels, getPullRequestListReview } from '@sr-services/Github'

/**
 * Runs whenever a pull request is labeled.
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is labeled.
 */
export const pullRequestReviewed = async (
  payload: Schema.PullRequestReviewSubmittedEvent
): Promise<void> => {
  const { pull_request: pullRequest, repository } = payload
  const repo = await fetchRepository(repository.name)
  const seniorReviewers = repo.senior_reviewers.map(
    (user: User) => user.github_username
  )
  if (seniorReviewers.length > 0) {
    const reviewList = await getPullRequestListReview(
      repository.name,
      pullRequest.number
    )
    const prSeniorReviewes = reviewList.filter(
      el => el.state === 'APPROVED' && seniorReviewers.includes(el.user.login)
    )
    const seniorUniqReviewers = prSeniorReviewes.map(el => el.user.login)
    if (seniorUniqReviewers.length >= repo.minimum_senior_reviewers) {
      info(
        `Adding the '${PassedReviewLabel}' label to '${repository.name}''#${pullRequest.number}...`
      )
      await addLabels(repository.name, pullRequest.number, [PassedReviewLabel])
    }
  }
}
