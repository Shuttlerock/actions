import { slackErrorChannelId, jiraEmail } from '@sr-services/Inputs'
import { client } from '@sr-services/Slack/Client'
import * as Message from '@sr-services/Slack/Message'

describe('Message', () => {
  const userId = 'U00001'
  let chatSpy: jest.SpyInstance

  beforeEach(() => {
    chatSpy = jest
      .spyOn(client.chat, 'postMessage')
      .mockReturnValue(Promise.resolve({ ok: true }))
  })

  afterEach(() => {
    chatSpy.mockRestore()
  })

  describe('scrubMessage', () => {
    it('removes secrets', () => {
      const message = `The Jira email is ${jiraEmail()}. Yes, ${jiraEmail()}!`
      const expected =
        'The Jira email is ****************. Yes, ****************!'
      expect(Message.scrubMessage(message)).toEqual(expected)
    })
  })

  describe('sendErrorMessage', () => {
    it('posts a message to the Slack error channel', async () => {
      await Message.sendErrorMessage(`my email is ${jiraEmail()}`)
      await Message.sendErrorMessage('my message')
      expect(chatSpy).toHaveBeenCalledWith({
        channel: slackErrorChannelId(),
        text: 'my email is ****************',
        unfurl_links: false,
        unfurl_media: false,
      })
    })
  })

  describe('sendUserMessage', () => {
    it('posts a message to the Slack user', async () => {
      await Message.sendUserMessage(userId, 'my message')
      expect(chatSpy).toHaveBeenCalledWith({
        channel: userId,
        text: 'my message',
        unfurl_links: false,
        unfurl_media: false,
      })
    })
  })

  describe('reportError', () => {
    it('posts a message to the Slack user', async () => {
      await Message.reportError(userId, 'my error')
      expect(chatSpy).toHaveBeenCalledWith({
        channel: userId,
        text: 'my error',
        unfurl_links: false,
        unfurl_media: false,
      })
    })
  })

  describe('reportInfo', () => {
    it('posts a message to the Slack user', async () => {
      await Message.reportInfo(userId, 'my info')
      expect(chatSpy).toHaveBeenCalledWith({
        channel: userId,
        text: 'my info',
        unfurl_links: false,
        unfurl_media: false,
      })
    })
  })
})
