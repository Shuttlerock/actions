import { ChatPostMessageArguments } from '@slack/web-api'

import { slackErrorChannelId } from '@sr-services/Inputs'
import { client } from '@sr-services/Slack/Client'
import { sendErrorMessage, sendUserMessage } from '@sr-services/Slack/Message'

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
        channel: slackErrorChannelId(),
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
