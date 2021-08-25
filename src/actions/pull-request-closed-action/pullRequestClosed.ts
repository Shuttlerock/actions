import { info } from '@actions/core'
import Schema from '@octokit/webhooks-types'
import isNil from 'lodash/isNil'

import { ReleaseBranchName } from '@sr-services/Constants'
import { fetchRepository } from '@sr-services/Credentials'
import { createReleaseTag, getIssueKey } from '@sr-services/Github'
import {
  createRelease as createJiraRelease,
  getIssue,
  getValidatedColumn,
  setIssueStatus,
} from '@sr-services/Jira'

/**
 * Runs whenever a pull request is closed (not necessarily merged).
 *
 * @param {WebhookPayloadPullRequest} payload The JSON payload from Github sent when a pull request is closed.
 */
export const pullRequestClosed = async (
  payload: Schema.PullRequestEvent
): Promise<void> => {
  const { pull_request: pullRequest, repository } = payload

  // Used for log messages.
  const prName = `${repository.name}#${pullRequest.number}`

  if (!pullRequest.merged) {
    info(`${prName} is not merged - ignoring`)
    return
  }

  if (pullRequest.head.ref === ReleaseBranchName) {
    info(`${prName} looks like a release - creating Github + Jira releases...`)
    // The title looks like 'Release Candidate 2021-01-12-0426 (Energetic Eagle)'.
    const matches = /^Release Candidate ([0-9-]+) \(([A-Za-z\s]+)\)$/.exec(
      pullRequest.title || ''
    )
    if (isNil(matches) || isNil(matches[1]) || isNil(matches[2])) {
      info(
        `Couldn't extract the tag name and release name from the pull request title ('${pullRequest.title}') - no tag will be created`
      )
    } else {
      const releaseVersion = `v${matches[1]}` // v2021-01-12-0426
      const releaseName = matches[2] // Energetic Eagle
      const repo = await fetchRepository(repository.name)

      if (!repo?.skip_jira_release) {
        info(`Creating Jira release ${releaseVersion} (${releaseName})...`)
        await createJiraRelease(
          repository.name,
          pullRequest.number,
          releaseVersion,
          releaseName
        )
      }

      // Discard the first line (the PR heading), because it is basically a duplicate of the release name.
      info(`Creating Github release ${releaseVersion} (${releaseName})...`)
      const [, ...releaseNotes] = (pullRequest.body || '').split('\n')
      await createReleaseTag(
        repository.name,
        releaseVersion, // v2021-01-12-0426
        releaseName, // Energetic Eagle
        releaseNotes.join('\n') // Release notes.
      )
      info(`Created the release ${releaseVersion}`)

      return
    }
  }

  info(`Getting the Jira key from the pull request ${prName}...`)
  const issueKey = getIssueKey(pullRequest)
  if (isNil(issueKey)) {
    info(`Couldn't extract a Jira issue key from ${prName} - ignoring`)
    return
  }

  info(`Fetching the Jira issue ${issueKey}...`)
  const issue = await getIssue(issueKey)
  if (isNil(issue)) {
    info(`Couldn't find a Jira issue for ${prName} - ignoring`)
    return
  }
  if (isNil(issue.fields.project)) {
    info(`Couldn't find a project for Jira issue ${issueKey} - ignoring`)
    return
  }

  // Some boards use 'Review' rather than 'Tech review'.
  const validatedColumn = await getValidatedColumn(issue.fields.project.id)

  if (issue.fields.status.name === validatedColumn) {
    info(`Jira issue ${issueKey} is already in '${validatedColumn}' - ignoring`)
    return
  }

  info(`Moving Jira issue ${issueKey} to '${validatedColumn}'...`)
  await setIssueStatus(issue.id, validatedColumn)
}
