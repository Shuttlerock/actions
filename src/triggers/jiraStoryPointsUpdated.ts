import { info } from '@actions/core'
import isNil from 'lodash/isNil'

import {
  getChildIssues,
  getIssue,
  Issue,
  JiraFieldStoryPointEstimate,
  updateCustomField,
} from '@sr-services/Jira'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/jiraStoryPointsUpdated.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "jiraStoryPointsUpdated", "param": "STUDIO-1150" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} email    The email address of the user who transitioned the issue.
 * @param {string} issueKey The key of the Jira issue that was transitioned.
 */
export const jiraStoryPointsUpdated = async (
  email: string,
  issueKey: string
): Promise<void> => {
  info(`Fetching the Jira issue ${issueKey}...`)
  const issue = await getIssue(issueKey)
  if (isNil(issue)) {
    info(`Issue ${issueKey} could not be found - giving up`)
    return
  }

  info(`Fetching the direct children of issue ${issueKey}...`)
  const children = await getChildIssues(issueKey)
  if (children.length > 0) {
    info(`Summing story points for ${children.length} children...`)
    const sum = children.reduce((total: number, child: Issue) => {
      return total + (child.fields.storyPointEstimate || 0)
    }, 0)

    if (sum === 0) {
      info(`Children of ${issueKey} have zero points estimated - giving up`)
      return
    }

    if (issue.fields.storyPointEstimate === sum) {
      info(
        `Issue ${issueKey} estimate is already set to ${sum} points - giving up`
      )
      return
    }

    info(`Setting the story point estimate for ${issueKey} to ${sum}...`)
    await updateCustomField(issue, JiraFieldStoryPointEstimate, sum)
  }

  // If this story has no parent, we're done.
  if (isNil(issue.fields.parent)) {
    info(`Issue ${issueKey} has no parent - finished`)
    return
  }

  // If this story has a parent, call on the parent.
  info(
    `Issue ${issueKey} has a parent - summing points for ${issue.fields.parent.key}`
  )
  await jiraStoryPointsUpdated(email, issue.fields.parent.key)

  info(`Finished summing ${issue.fields.parent.key}`)
}
