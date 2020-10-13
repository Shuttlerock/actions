import { ChatPostMessageArguments } from '@slack/web-api'

import { SlackErrorChannelId } from '@sr-services/Constants'
import { client } from '@sr-services/slack/Client'
import { sendErrorMessage, sendUserMessage } from '@sr-services/slack/Message'

describe('Message', () => {
  describe('sendErrorMessage', () => {
    it('posts a message to the Slack error channel', async () => {
      const spy = jest
        .spyOn(client.chat, 'postMessage')
        .mockImplementation((_options?: ChatPostMessageArguments) =>
          Promise.resolve({ ok: true })
        )
      await sendErrorMessage('my message')
      expect(spy).toHaveBeenCalledWith({
        channel: SlackErrorChannelId,
        text: 'my message',
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
      await sendUserMessage('U00001', 'my message')
      expect(spy).toHaveBeenCalledWith({
        channel: 'U00001',
        text: 'my message',
      })
      spy.mockRestore()
    })
  })
})