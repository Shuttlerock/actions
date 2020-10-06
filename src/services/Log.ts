import { debug as coreDebug } from '@actions/core'

/**
 * Logs the given message. This is a wrapper around the Github debug() method
 * allowing it to log objects as well as strings.
 *
 * @param {unknown} message The string or object to log.
 */
export const debug = (message: string | unknown): void => {
  const payload =
    typeof message === 'string' ? message : JSON.stringify(message, null, 2)
  coreDebug(payload)
}
