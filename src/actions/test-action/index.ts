import {debug, error, getInput, setFailed, setOutput} from '@actions/core'

import {wait} from '@sr-actions/test-action/wait'

/**
 *
 */
async function run(): Promise<void> {
  try {
    const ms: string = getInput('milliseconds')
    debug(`Waiting ${ms} milliseconds ...`) // debug is only output if you set the secret `ACTIONS_RUNNER_DEBUG` to true
    await wait(parseInt(ms, 10))
    setOutput('time', new Date().toTimeString())
  } catch (err) {
    setFailed(err.message)
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run().catch(err => error(err))
