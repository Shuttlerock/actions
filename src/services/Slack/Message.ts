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
  // See: https://api.slack.com/methods/chat.postMessage
  await client.chat.postMessage({ channel: userId, text: message })
}
