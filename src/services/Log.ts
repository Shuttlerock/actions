import {debug as coreDebug} from '@actions/core'

export const debug = (message: string | unknown): void => {
  const payload =
    typeof message === 'string' ? message : JSON.stringify(message, null, 2)
  coreDebug(payload)
}
