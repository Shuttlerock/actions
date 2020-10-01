import {error, setFailed, getInput} from '@actions/core'
import {context} from '@actions/github'

import {debug} from '@sr-services/Log'

interface Context {
  payload: {
    inputs: {
      event: string
      param: string
    }
  }
}

/**
 * Extracts the payload and decides what action to run as a result.
 */
export const run = async (): Promise<void> => {
  const {
    payload: {
      inputs: {event, param},
    },
  } = ((await context) as unknown) as Context

  const jiraToken = getInput('jira-token', {required: true})
  const repoToken = getInput('repo-token', {required: true})
  const writeToken = getInput('write-token', {required: true})

  debug('------------------------------')
  debug(event)
  debug(param)
  debug(jiraToken)
  debug(repoToken)
  debug(writeToken)
  debug('------------------------------')
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  setFailed(err.message)
})
