import { EventPayloads } from '@octokit/webhooks'

import rawPayload from '@sr-actions/pull-request-labeled-action/__tests__/fixtures/pull-request-labeled.json'
import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'
import { GithubWriteUser, PleaseReviewLabel } from '@sr-services/Constants'
import * as Github from '@sr-services/Github'

jest.mock('@sr-services/Jira', () => ({
  setLabels: jest.fn(),
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({ addLabels: jest.fn() }))

describe('pull-request-labeled-action', () => {
  describe('pullRequestLabeled', () => {
    let addLabelsSpy: jest.SpyInstance
    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const payload = (rawPayload as unknown) as EventPayloads.WebhookPayloadPullRequest

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockImplementation(
          (_repo: Github.Repository, _num: number, _added: string[]) =>
            Promise.resolve([])
        )
    })

    afterEach(() => {
      addLabelsSpy.mockRestore()
    })

    it('adds the specified labels', async () => {
      await pullRequestLabeled(payload)
      expect(addLabelsSpy).toHaveBeenCalledWith(payload.repository.name, 136, [
        PleaseReviewLabel,
      ])
    })

    it('does nothing if the event was triggered by another Github action', async () => {
      const automatedPayload = ({
        ...payload,
        sender: {
          login: GithubWriteUser,
        },
      } as unknown) as EventPayloads.WebhookPayloadPullRequest
      await pullRequestLabeled(automatedPayload)
      expect(addLabelsSpy.mock.calls.length).toBe(0)
    })
  })
})
