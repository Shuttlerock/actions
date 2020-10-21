import { WebClient } from '@slack/web-api'

import { slackToken } from '@sr-services/Constants'

// We had to roll back the NCC version so that this would work.
// See https://github.com/vercel/ncc/issues/590#issuecomment-694539022
export const client = new WebClient(slackToken())
