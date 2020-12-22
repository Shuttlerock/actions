import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { apiPrefix } from '@sr-services/Jira/Client'

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
