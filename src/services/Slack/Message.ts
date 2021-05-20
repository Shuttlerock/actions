import escapeRegExp from 'lodash/escapeRegExp'
import isFunction from 'lodash/isFunction'
import isNil from 'lodash/isNil'

import { slackErrorChannelId } from '@sr-services/Inputs'
import * as Inputs from '@sr-services/Inputs'
import { client } from '@sr-services/Slack/Client'

/**
 * Returns a random 'negative' emoji.
 *
 * @returns {string} A slack emoji.
 */
export const negativeEmoji = (): string => {
  const emoji = [
    'bomb',
    'cry',
    'crying_cat_face',
    'disappointed',
    'dizzy_face',
    'man-facepalming',
    'man-shrugging',
    'sadpanda',
    'scream_cat',
    'thumbsdown',
    'unamused',
    'woman-facepalming',
    'woman-shrugging',
    'worried',
  ]
  return `:${emoji[Math.floor(Math.random() * emoji.length)]}:`
}

/**
 * Returns a random 'positive' emoji.
 *
 * @returns {string} A slack emoji.
 */
export const positiveEmoji = (): string => {
  const emoji = [
    'thumbsup',
    'clap',
    'tada',
    'dart',
    'drunken_parrot',
    'star-struck',
    '100',
    'boom',
    'confetti_ball',
    'fire',
  ]
  return `:${emoji[Math.floor(Math.random() * emoji.length)]}:`
}

/**
 * Makes sure that secrets in the message are scrubbed out.
 *
 * @param {string} message The message to send.
 * @returns {string} The scrubbed message
 */
export const scrubMessage = (message: string): string => {
  let result = message
  Object.values(Inputs).forEach(func => {
    if (isFunction(func)) {
      const secret = func()
      const regex = new RegExp(`(${escapeRegExp(secret)})`, 'g')
      result = result.replace(regex, '*'.repeat(secret.length))
    }
  })
  return result
}

/**
 * Sends an error message to the default slack group.
 *
 * @param {string} message The message to send.
 * @returns {void}
 */
export const sendErrorMessage = async (message: string): Promise<void> => {
  if (isNil(message)) {
    return
  }

  await client.chat.postMessage({
    channel: slackErrorChannelId(),
    text: scrubMessage(message),
    unfurl_links: false,
    unfurl_media: false,
  })
}

/**
 * Sends a slack message to the user with the given slack ID.
 *
 * @param {string} userId  The Slack user ID to send the message to.
 * @param {string} message The message to send.
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
    await client.chat.postMessage({
      channel: userId,
      text: message,
      unfurl_links: false,
      unfurl_media: false,
    })
  } catch (err) {
    if (err.message.match(/channel_not_found/)) {
      return
    }

    throw err
  }
}
