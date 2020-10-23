import { createHmac } from 'crypto'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { Repository } from '@sr-services/Github'
import { credentialsApiPrefix, credentialsApiSecret } from '@sr-services/Inputs'

export interface Credentials {
  email: string
  github_token: string
  github_username: string
  leads: Repository[]
  reviews: Repository[]
  slack_id: string
  status: 'forbidden' | 'not_found' | 'ok'
}

/**
 * Fetches the user credentials from the remote credential service for the given email of name.
 *
 * @param {string} identifier The email address or Jira display name of the user to look up.
 *
 * @returns {Credentials} The credentials object.
 */
export const fetchCredentials = async (
  identifier?: string
): Promise<Credentials> => {
  if (isNil(identifier)) {
    throw new Error(
      'Could not lookup user credentials because no identifier or display name was found'
    )
  }

  const id = Buffer.from(identifier).toString('base64')
  const signature = createHmac('sha256', credentialsApiSecret())
    .update(identifier)
    .digest('hex')
  const url = `${credentialsApiPrefix()}${id}`

  const response = await fetch(url, {
    headers: { 'Shuttlerock-Signature': `sha256=${signature}` },
  })

  const credentials = (await response.json()) as Credentials

  if (credentials.status !== 'ok') {
    throw new Error(`Could not get credentials for the user ${identifier}`)
  }

  return credentials
}
