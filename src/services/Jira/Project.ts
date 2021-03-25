import { info } from '@actions/core'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { apiPrefix, client } from '@sr-services/Jira/Client'
import {
  JiraStatusInDevelopment,
  JiraStatusInProgress,
  JiraStatusReview,
  JiraStatusTechReview,
  JiraStatusValidated,
} from '@sr-services/Jira/Issue'

export interface JiraBoard {
  id: number
  location: {
    projectId: number
  }
}

export interface JiraBoardList {
  isLast: boolean
  maxResults: number
  startAt: number
  total: number
  values: JiraBoard[]
}

export interface JiraBoardColumn {
  name: string
}

export interface JiraBoardConfiguration {
  columnConfig: {
    columns: JiraBoardColumn[]
  }
  id: number
  name: string
}

interface JiraProject {
  id: string
}

/**
 * Fetches the board definition for the given project ID.
 *
 * @param {string} projectId The *numeric* ID of the Jira project (eg. 10003).
 *
 * @returns {JiraBoard | undefined} The board belonging to te project.
 */
export const getBoard = async (
  projectId: string
): Promise<JiraBoard | undefined> => {
  // We can't look up a board by the projectId, so we need to fetch the list of boards and find it.
  // We ignore pagination for now, and assume there is only one page of results.
  const url = `${apiPrefix()}/rest/agile/1.0/board/`
  const response = await fetch(url)
  const data = (await response.json()) as JiraBoardList
  const board = data.values.find(
    (brd: JiraBoard) => brd.location.projectId.toString() === projectId
  )

  return board
}

/**
 * Fetches the list of columns for the project with the given ID.
 *
 * @param {string} projectId The *numeric* ID of the Jira project (eg. 10003).
 *
 * @returns {JiraBoardColumn[] | undefined} The board belonging to te project.
 */
export const getColumns = async (
  projectId: string
): Promise<JiraBoardColumn[] | undefined> => {
  const board = await getBoard(projectId)
  if (isNil(board)) {
    return undefined
  }

  // We can't look up a board by the projectId, so we need to fetch the list of boards and find it.
  // We ignore pagination for now, and assume there is only one page of results.
  const url = `${apiPrefix()}/rest/agile/1.0/board/${board.id}/configuration`
  const response = await fetch(url)
  const data = (await response.json()) as JiraBoardConfiguration

  return data.columnConfig.columns
}

/**
 * Some boards use 'In progress' rather than 'In development' to mark issues as in-progress.
 * This fetches the column names for the project and decides which one is appropriate.
 *
 * @param {string} projectId The *numeric* ID of the Jira project (eg. 10003).
 *
 * @returns {string} The name of the column used to mark issues as in-progress.
 */
export const getInProgressColumn = async (
  projectId: string
): Promise<string> => {
  info(`Finding the 'In progress' column names for the project ${projectId}...`)
  const columns = await getColumns(projectId)
  if (isNil(columns) || columns.length === 0) {
    throw new Error(`No columns found for project ${projectId}`)
  }

  const inProgressColumn = columns.find((col: JiraBoardColumn) =>
    [
      JiraStatusInDevelopment.toLowerCase(),
      JiraStatusInProgress.toLowerCase(),
    ].includes(col.name.toLowerCase())
  )?.name

  if (isNil(inProgressColumn)) {
    throw new Error(
      `Couldn't find an in-progress column for project ${projectId} - giving up`
    )
  }

  return inProgressColumn
}

/**
 * Some boards use 'Review' rather than 'Tech review' to mark issues as ready-for-review.
 * This fetches the column names for the project and decides which one is appropriate.
 *
 * @param {string} projectId The *numeric* ID of the Jira project (eg. 10003).
 *
 * @returns {string} The name of the column used to mark issues as ready-for-review.
 */
export const getReviewColumn = async (projectId: string): Promise<string> => {
  info(`Finding the 'Review' column names for the project ${projectId}...`)
  const columns = await getColumns(projectId)
  if (isNil(columns) || columns.length === 0) {
    throw new Error(`No columns found for project ${projectId}`)
  }

  const reviewColumn = columns.find((col: JiraBoardColumn) =>
    [
      JiraStatusReview.toLowerCase(),
      JiraStatusTechReview.toLowerCase(),
    ].includes(col.name.toLowerCase())
  )?.name

  if (isNil(reviewColumn)) {
    throw new Error(
      `Couldn't find a review column for project ${projectId} - giving up`
    )
  }

  return reviewColumn
}

/**
 * Some boards don't have a 'Validated' column. In that case we will just put them in
 * 'Review', if it exists.
 *
 * @param {string} projectId The *numeric* ID of the Jira project (eg. 10003).
 *
 * @returns {string} The name of the column used to mark issues as validated.
 */
export const getValidatedColumn = async (
  projectId: string
): Promise<string> => {
  info(`Finding the 'Validated' column names for the project ${projectId}...`)
  const columns = await getColumns(projectId)
  if (isNil(columns) || columns.length === 0) {
    throw new Error(`No columns found for project ${projectId}`)
  }

  const validatedColumn = columns.find((col: JiraBoardColumn) =>
    [
      JiraStatusValidated.toLowerCase(),
      JiraStatusReview.toLowerCase(),
    ].includes(col.name.toLowerCase())
  )?.name

  if (isNil(validatedColumn)) {
    throw new Error(
      `Couldn't find a validated column for project ${projectId} - giving up`
    )
  }

  return validatedColumn
}

/**
 * Fetches the project with the given ID.
 *
 * @param {string} projectKey The key of the Jira project (eg. 'STUDIO').
 *
 * @returns {JiraProject} The project.
 */
export const getProject = async (projectKey: string): Promise<JiraProject> => {
  const data = await client.getProject(projectKey)
  return data as JiraProject
}
