import { WebClient } from '@slack/web-api'

import { SlackErrorChannelId, SlackToken } from '@sr-services/Constants'

// We had to roll back the NCC version so that this would work.
// See https://github.com/vercel/ncc/issues/590#issuecomment-694539022
const client = new WebClient(SlackToken)

/**
 * Sends an error message to the default slack group.
 *
 * @param {string} message The message to send.
 *
 * @returns {void}
 */
export const sendErrorMessage = async (message: string): Promise<void> => {
  await client.chat.postMessage({ channel: SlackErrorChannelId, text: message })
}

/**
 * Sends a slack message to the user with the given slack ID.
 *
 * @param {string} userId  The Slack user ID to send the message to.
 * @param {string} message The message to send.
 *
 * @returns {void}
 */
export const sendUserMessage = async (
  userId: string,
  message: string
): Promise<void> => {
  // See: https://api.slack.com/methods/chat.postMessage
  await client.chat.postMessage({ channel: userId, text: message })
}
