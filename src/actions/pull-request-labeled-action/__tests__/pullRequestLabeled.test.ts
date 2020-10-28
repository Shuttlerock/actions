import { EventPayloads } from '@octokit/webhooks'

import rawPayload from '@sr-actions/pull-request-labeled-action/__tests__/fixtures/pull-request-labeled.json'
import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'
import {
  GithubWriteUser,
  InProgressLabel,
  PleaseReviewLabel,
  UnderDiscussionLabel,
} from '@sr-services/Constants'
import * as Github from '@sr-services/Github'

jest.mock('@sr-services/Jira', () => ({
  setLabels: jest.fn(),
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({ setLabels: jest.fn() }))

describe('pull-request-labeled-action', () => {
  describe('pullRequestLabeled', () => {
    let setLabelsSpy: jest.SpyInstance
    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const payload = (rawPayload as unknown) as EventPayloads.WebhookPayloadPullRequest

    beforeEach(() => {
      setLabelsSpy = jest
        .spyOn(Github, 'setLabels')
        .mockImplementation(
          (_repo: Github.Repository, _num: number, _labels?: string[]) =>
            Promise.resolve([])
        )
    })

    afterEach(() => {
      setLabelsSpy.mockRestore()
    })

    it('removes mutually exlusive labels', async () => {
      const existing = payload.pull_request.labels.map(
        (lbl: EventPayloads.WebhookPayloadPullRequestLabel) => lbl.name
      )
      expect(existing).toEqual([InProgressLabel, UnderDiscussionLabel])
      await pullRequestLabeled(payload)
      expect(setLabelsSpy).toHaveBeenCalledWith(payload.repository.name, 136, [
        PleaseReviewLabel,
        UnderDiscussionLabel,
      ])
    })

    it('does nothing if there are no labels to remove', async () => {
      const unchangedPayload = ({
        ...payload,
        pull_request: {
          ...payload.pull_request,
          labels: [{ name: 'please-review' }],
        },
      } as unknown) as EventPayloads.WebhookPayloadPullRequest
      await pullRequestLabeled(unchangedPayload)
      expect(setLabelsSpy.mock.calls.length).toBe(0)
    })

    it('does nothing if the event was triggered by another Github action', async () => {
      const automatedPayload = ({
        ...payload,
        sender: {
          login: GithubWriteUser,
        },
      } as unknown) as EventPayloads.WebhookPayloadPullRequest
      await pullRequestLabeled(automatedPayload)
      expect(setLabelsSpy.mock.calls.length).toBe(0)
    })
  })
})
