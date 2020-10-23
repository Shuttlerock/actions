import fetch from 'node-fetch'

import { fetchCredentials } from '@sr-services/Credentials'
import { mockCredentials, mockForbiddenCredentials } from '@sr-tests/Mocks'

const { Response } = jest.requireActual('node-fetch')

jest.mock('node-fetch', () => jest.fn())

// The email address to look up credentials for.
const email = 'user@example.com'

// The URL with the encoded 'user@example.com' email address.
const url =
  'https://users.example.com/api/private/credentials/dXNlckBleGFtcGxlLmNvbQ=='

// HMAC signature for the test email address.
const signature =
  'sha256=e3b2e2d247a3560b2fb00e152ac450bcf915e9c780dfabf28ed6666effecd6e1'

describe('Credentials', () => {
  describe('fetchCredentials', () => {
    it('calls the credential API', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockCredentials))
      )
      const result = await fetchCredentials(email)
      expect(result.github_token).toEqual(mockCredentials.github_token)
      expect(fetch).toHaveBeenCalledWith(url, {
        headers: { 'Shuttlerock-Signature': signature },
      })
    })

    it('throws an error if the API returns an error', () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(mockForbiddenCredentials))
      )
      fetchCredentials(email).catch(err => {
        expect(err.message).toEqual(
          `Could not get credentials for the user ${email}`
        )
      })
    })
  })
})
