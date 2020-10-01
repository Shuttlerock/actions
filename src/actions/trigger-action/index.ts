import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'

import { createPullRequestForJiraIssue } from '@sr-triggers/index'

interface Context {
  payload: {
    inputs: {
      email: string
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
      inputs: { email, event, param },
    },
  } = ((await context) as unknown) as Context

  switch (event) {
    case 'createPullRequestForJiraIssue':
      await createPullRequestForJiraIssue(email, param)
      break
    default:
      throw new Error(`Unknown event ${event}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  setFailed(err.message)
})
