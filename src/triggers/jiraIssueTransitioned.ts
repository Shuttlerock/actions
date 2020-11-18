import { info } from '@actions/core'
import isNil from 'lodash/isNil'
import minBy from 'lodash/minBy'

import {
  JiraBoardColumn,
  getChildIssues,
  getColumns,
  getIssue,
  Issue,
  setIssueStatus,
} from '@sr-services/Jira'

/**
 * To trigger this event manually:
 *
 * $ act --job trigger_action --eventpath src/actions/trigger-action/__tests__/fixtures/jiraIssueTransitioned.json
 *
 * or to trigger it via the Github API:
 *
 * $ curl --header "Accept: application/vnd.github.v3+json" \
 * --header  "Authorization: token YOUR_TOKEN" \
 * --request POST \
 * --data    '{"ref": "develop", "inputs": { "email": "dave@shuttlerock.com", "event": "jiraIssueTransitioned", "param": "STUDIO-860" }}' \
 * https://api.github.com/repos/Shuttlerock/actions/actions/workflows/trigger-action.yml/dispatches
 *
 * @param {string} _email    The email address of the user who transitioned the issue.
 * @param {string} issueKey The key of the Jira issue that was transitioned.
 */
export const jiraIssueTransitioned = async (
  _email: string,
  issueKey: string
): Promise<void> => {
  info(`Fetching the Jira issue ${issueKey}...`)
  const issue = await getIssue(issueKey)
  if (isNil(issue)) {
    info(`Issue ${issueKey} could not be found - giving up`)
    return
  }

  if (isNil(issue.fields.parent)) {
    info(`Issue ${issueKey} has no parent issue - nothing to do`)
    return
  }

  info(`Fetching the parent issue ${issue.fields.parent.key}...`)
  const parent = await getIssue(issue.fields.parent.key)
  if (isNil(parent)) {
    throw new Error(
      `Parent issue ${issue.fields.parent.key} could not be found`
    )
  }

  info(`Fetching the direct children of issue ${parent.key}...`)
  const children = await getChildIssues(parent.key)
  if (children.length === 0) {
    throw new Error(`No children found for parent issue ${parent.key}`)
  }

  if (isNil(parent.fields.project)) {
    throw new Error(`No project attached to parent issue ${parent.key}`)
  }

  info(
    `Fetching the column names for the project ${parent.fields.project.key}...`
  )
  const columns = await getColumns(parent.fields.project.id)
  if (isNil(columns) || columns.length === 0) {
    throw new Error(`No columns found for project ${parent.fields.project.key}`)
  }
  const columnNames = columns.map((col: JiraBoardColumn) => col.name)

  info('Finding the left-most status for child issues...')
  const statuses = [
    ...new Set(children.map((child: Issue) => child.fields.status.name)),
  ]
  const leftmost = minBy(statuses, (status: string) =>
    columnNames.indexOf(status)
  )
  if (isNil(leftmost)) {
    throw new Error(
      `Couldn't find the leftomost issue status for children of ${parent.key}`
    )
  }

  if (parent.fields.status.name === leftmost) {
    info(
      `The parent issue ${parent.key} is already in '${leftmost}' - nothing to do`
    )
  } else {
    info(`Moved the parent issue ${parent.key} to '${leftmost}'`)
    await setIssueStatus(parent.id, leftmost)
  }
}
