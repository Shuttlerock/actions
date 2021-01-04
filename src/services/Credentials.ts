import { createHmac } from 'crypto'
import isNil from 'lodash/isNil'
import fetch from 'node-fetch'

import { Repository as RepositoryType } from '@sr-services/Github/Git'
import { credentialsApiPrefix, credentialsApiSecret } from '@sr-services/Inputs'

export interface User {
  email: string
  github_token: string
  github_username: string
  slack_id: string
}

export interface Credentials extends User {
  leads: RepositoryType[]
  reviews: RepositoryType[]
  status: 'forbidden' | 'not_found' | 'ok'
}

export interface Repository {
  leads: User[]
  reviewers: User[]
  status: 'forbidden' | 'not_found' | 'ok'
}

/**
 * Fetches the user credentials from the remote credential service for the given email or name.
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
  const url = `${credentialsApiPrefix()}credentials/${id}`

  const response = await fetch(url, {
    headers: { 'Shuttlerock-Signature': `sha256=${signature}` },
  })

  const credentials = (await response.json()) as Credentials

  if (credentials.status !== 'ok') {
    throw new Error(`Could not get credentials for the user ${identifier}`)
  }

  return credentials
}

/**
 * Fetches the repository with the given name from the remote credential service.
 *
 * @param {string} name The name of the repository to look up.
 *
 * @returns {Repository} The repository object.
 */
export const fetchRepository = async (name: string): Promise<Repository> => {
  const id = Buffer.from(name).toString('base64')
  const signature = createHmac('sha256', credentialsApiSecret())
    .update(name)
    .digest('hex')
  const url = `${credentialsApiPrefix()}repositories/${id}`

  const response = await fetch(url, {
    headers: { 'Shuttlerock-Signature': `sha256=${signature}` },
  })

  const repository = (await response.json()) as Repository

  if (repository.status !== 'ok') {
    throw new Error(`Could not get repository with the name ${name}`)
  }

  return repository
}
