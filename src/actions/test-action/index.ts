import { error, getInput, setFailed, setOutput } from '@actions/core'

import { wait } from '@sr-actions/test-action/wait'

/**
 *
 */
async function run(): Promise<void> {
  try {
    const ms: string = getInput('milliseconds')
    await wait(parseInt(ms, 10))
    setOutput('time', new Date().toTimeString())
  } catch (err) {
    setFailed(err.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => error(err))
