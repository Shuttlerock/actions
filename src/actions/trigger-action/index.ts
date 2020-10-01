import {error, setFailed} from '@actions/core'
import {context} from '@actions/github'

import {debug} from '@sr-services/Log'

/**
 * Extracts the payload and decides what action to run as a result.
 */
export const run = async (): Promise<void> => {
  const {payload} = (await context) as any

  debug(payload)
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => {
  error(err)
  setFailed(err.message)
})
