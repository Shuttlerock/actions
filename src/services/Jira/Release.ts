import { error, info } from '@actions/core'
import isEmpty from 'lodash/isEmpty'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'
import { escape } from 'querystring'

import { fetchRepository } from '@sr-services/Credentials'
import { Commit, Repository } from '@sr-services/Github/Git'
import {
  getPullRequest,
  listPullRequestCommits,
  pullRequestUrl,
} from '@sr-services/Github/PullRequest'
import { apiPrefix, client } from '@sr-services/Jira/Client'
import {
  JiraStatusDone,
  setIssueStatus,
  setVersion,
} from '@sr-services/Jira/Issue'
import { getProject } from '@sr-services/Jira/Project'

interface JiraRelease {
  id: string
  description: string
  name: string
  released: boolean
}

interface FindJiraReleaseResponse {
  total: number
  values: JiraRelease[]
}

/**
 * Creates a release in Jira with the given name.
 *
 * @param {string} projectKey  The key of the project which we will create a release for.
 * @param {string} name        The name of the release.
 * @param {string} description The release description.
 *
 * @returns {JiraRelease} The newly created release.
 */
export const createJiraRelease = async (
  projectKey: string,
  name: string,
  description: string
): Promise<JiraRelease> => {
  info(`Fetching the project '${projectKey}'...`)
  const project = await getProject(projectKey)

  const args = {
    description,
    name,
    projectId: project.id,
    released: true,
    releaseDate: new Date(),
  }
  // The types for createVersion() are messed up, and expect a string.
  const data = (await client.createVersion(
    (args as unknown) as string
  )) as JiraRelease
  return data
}

/**
 * Tries to find a release in Jira with the given name.
 *
 * @param {string} projectKey The key of the project whose release we are looking for.
 * @param {string} name       The name of the release.
 *
 * @returns {JiraRelease | undefined} The release if it exists, or undefined if it doesn't.
 */
export const findJiraRelease = async (
  projectKey: string,
  name: string
): Promise<JiraRelease | undefined> => {
  const url = `${apiPrefix()}/rest/api/3/project/${projectKey}/version?orderBy=-sequence&query=${escape(
    name
  )}`
  const response = await fetch(url)
  const data = (await response.json()) as FindJiraReleaseResponse
  if (data.values.length === 0) {
    return undefined
  }
  if (data.values.length > 1) {
    throw new Error(`Found multiple Jira releases with the name '${name}'`)
  }

  return data.values[0]
}

/**
 * Creates a Jira release for the given release pull request.
 *
 * @param {Repository} repoName       The name of the repository that is being released.
 * @param {number}     prNumber       The release PR number.
 * @param {string}     releaseVersion The version tag for teh release (eg. v2021-01-12-0426).
 * @param {string}     releaseName    The release name (eg. 'Energetic Eagle').
 */
export const createRelease = async (
  repoName: Repository,
  prNumber: number,
  releaseVersion: string,
  releaseName: string
): Promise<void> => {
  // Used for log messages.
  const prName = `${repoName}#${prNumber}`

  info(`Fetching the release pull request ${prName}`)
  const pullRequest = await getPullRequest(repoName, prNumber)
  if (isNil(pullRequest)) {
    error(`Could not fetch the release pull request ${prName}`)
    return
  }

  const commits = await listPullRequestCommits(repoName, prNumber)
  if (isNil(commits)) {
    error(`Could not list commits for the release pull request ${prName}`)
    return
  }

  // Extract the Jira issue keys from the commit list.
  const issueKeys = [
    ...new Set(
      commits
        .map((commit: Commit) => {
          const matches = /\[([A-Z]+-\d+)\]/.exec(
            commit.commit.message.split('\n')[0]
          )
          return matches && matches[1]
        })
        .filter((issueKey: string | null) => !isEmpty(issueKey))
    ),
  ] as string[]

  // Group the issue keys by project ID. We should only have one project per repo, but for future-proofing
  // we will allow multiple. This gives us eg. "{ PROJECT: ['PROJECT-1200', 'PROJECT-1201'] }".
  const issueKeysByProject: { [key: string]: string[] } = {}
  issueKeys.forEach((issueKey: string) => {
    const projectKey = issueKey.replace(/^([A-Z]+)-\d+$/, '$1')
    const existing = issueKeysByProject[projectKey] || []
    Object.assign(issueKeysByProject, { [projectKey]: [...existing, issueKey] })
  })

  const fullReleaseName = `${releaseVersion} (${releaseName})`
  let projectKeys = Object.keys(issueKeysByProject)
  if (projectKeys.length > 0) {
    info(
      `Found ${
        projectKeys.length
      } Jira project(s) to release (${projectKeys.join(', ')})`
    )
  } else {
    info(
      'Found no Jira projects - looking for a default project for this repository...'
    )
    const repo = await fetchRepository(repoName)
    if (repo?.jira_project_id) {
      info(`Assuming the default project with ID '${repo.jira_project_id}'`)
      projectKeys = [`${repo?.jira_project_id}`]
    }
  }

  await Promise.all(
    Object.keys(issueKeysByProject).map(async (projectKey: string) => {
      info(`Releasing project ${projectKey}...`)

      info(
        `Looking for an existing release with the name '${fullReleaseName}' in project ${projectKey}...`
      )
      let release = await findJiraRelease(projectKey, fullReleaseName)

      if (isNil(release)) {
        info('No existing release found - creating one...')
        release = await createJiraRelease(
          projectKey,
          fullReleaseName,
          `See ${pullRequestUrl(repoName, prNumber)}`
        )
        info(`Created a new release with ID ${release.id}`)
      } else {
        info(`Found an existing release with ID ${release.id}`)
      }

      const issueIds = issueKeysByProject[projectKey]
      info(`Adding ${issueIds.length} Jira issues(s) to the release...`)
      await Promise.all(
        issueIds.map(async (issueId: string) => {
          info(`Adding ${issueId} to the release...`)
          await setVersion(issueId, release?.id as string)

          info(`Moving ${issueId} to '${JiraStatusDone}'...`)
          await setIssueStatus(issueId, JiraStatusDone)
        })
      )
    })
  )
}
