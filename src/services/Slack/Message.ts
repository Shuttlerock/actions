import isNil from 'lodash/isNil'

import { slackErrorChannelId } from '@sr-services/Inputs'
import { client } from '@sr-services/Slack/Client'

/**
 * Sends an error message to the default slack group.
 *
 * @param {string} message The message to send.
 *
 * @returns {void}
 */
export const sendErrorMessage = async (message: string): Promise<void> => {
  if (isNil(message)) {
    return
  }

  await client.chat.postMessage({
    channel: slackErrorChannelId(),
    text: message,
  })
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
  if (isNil(userId) || isNil(message)) {
    return
  }

  try {
    // See: https://api.slack.com/methods/chat.postMessage
    await client.chat.postMessage({ channel: userId, text: message })
  } catch (err) {
    if (err.message.match(/channel_not_found/)) {
      return
    }

    throw err
  }
}
