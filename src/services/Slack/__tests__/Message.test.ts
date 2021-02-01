import { ChatPostMessageArguments } from '@slack/web-api'

import { slackErrorChannelId, jiraEmail } from '@sr-services/Inputs'
import { client } from '@sr-services/Slack/Client'
import {
  scrubMessage,
  sendErrorMessage,
  sendUserMessage,
} from '@sr-services/Slack/Message'

describe('Message', () => {
  describe('scrubMessage', () => {
    it('removes secrets', () => {
      const message = `The Jira email is ${jiraEmail()}. Yes, ${jiraEmail()}!`
      const expected =
        'The Jira email is ****************. Yes, ****************!'
      expect(scrubMessage(message)).toEqual(expected)
    })
  })

  describe('sendErrorMessage', () => {
    it('posts a message to the Slack error channel', async () => {
      const spy = jest
        .spyOn(client.chat, 'postMessage')
        .mockImplementation((_options?: ChatPostMessageArguments) =>
          Promise.resolve({ ok: true })
        )
      await sendErrorMessage('my message')
      expect(spy).toHaveBeenCalledWith({
        channel: slackErrorChannelId(),
        text: 'my message',
        unfurl_links: false,
        unfurl_media: false,
      })
      spy.mockRestore()
    })
  })

  describe('sendUserMessage', () => {
    it('posts a message to the Slack user', async () => {
      const spy = jest
        .spyOn(client.chat, 'postMessage')
        .mockImplementation((_options?: ChatPostMessageArguments) =>
          Promise.resolve({ ok: true })
        )
      await sendUserMessage('U00001', `my email is ${jiraEmail()}`)
      expect(spy).toHaveBeenCalledWith({
        channel: 'U00001',
        text: 'my email is ****************',
        unfurl_links: false,
        unfurl_media: false,
      })
      spy.mockRestore()
    })
  })
})
