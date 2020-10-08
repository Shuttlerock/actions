import { createHmac } from 'crypto'
import fetch from 'node-fetch'

import {
  CredentialsApiPrefix,
  CredentialsApiSecret,
} from '@sr-services/Constants'
import { Repository } from '@sr-services/github/Git'

export interface Credentials {
  github_token: string
  github_username: string
  leads: Repository[]
  reviews: Repository[]
  slack_id: string
  status: 'forbidden' | 'not_found' | 'ok'
}

export const getCredentialsByEmail = async (
  email: string
): Promise<Credentials> => {
  const id = Buffer.from(email).toString('base64')
  const signature = createHmac('sha256', CredentialsApiSecret)
    .update(email)
    .digest('hex')
  const url = `${CredentialsApiPrefix}${id}`

  const response = await fetch(url, {
    headers: { 'Shuttlerock-Signature': `sha256=${signature}` },
  })

  const credentials = (await response.json()) as Credentials

  if (credentials.status !== 'ok') {
    throw new Error(
      `Could not get credentials for the user ${email}, so no pull request will be created`
    )
  }

  return credentials
}
