import Schema from '@octokit/webhooks-definitions/schema'

import rawPayload from '@sr-actions/pull-request-labeled-action/__tests__/fixtures/pull-request-labeled.json'
import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'
import {
  DependenciesLabel,
  GithubWriteUser,
  PleaseReviewLabel,
  PriorityHighLabel,
  SecurityLabel,
} from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
import * as Slack from '@sr-services/Slack'
import { mockRepository } from '@sr-tests/Mocks'

jest.mock('@sr-services/Jira', () => ({
  setLabels: jest.fn(),
  setIssueStatus: jest.fn(),
}))
jest.mock('@sr-services/Github', () => ({
  addLabels: jest.fn(),
  assignOwners: jest.fn(),
  assignReviewers: jest.fn(),
  fetchRepositorySpy: jest.fn(),
  pullRequestUrl: () => 'https://example.com/',
}))
jest.mock('@sr-services/Slack', () => ({
  sendUserMessage: jest.fn(),
}))

describe('pull-request-labeled-action', () => {
  describe('pullRequestLabeled', () => {
    let addLabelsSpy: jest.SpyInstance
    let fetchRepositorySpy: jest.SpyInstance
    let sendUserMessageSpy: jest.SpyInstance

    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const payload = rawPayload as unknown as Schema.PullRequestLabeledEvent

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockReturnValue(Promise.resolve([]))
      fetchRepositorySpy = jest
        .spyOn(Credentials, 'fetchRepository')
        .mockReturnValue(Promise.resolve(mockRepository))
      sendUserMessageSpy = jest
        .spyOn(Slack, 'sendUserMessage')
        .mockReturnValue(Promise.resolve())
    })

    afterEach(() => {
      addLabelsSpy.mockRestore()
      fetchRepositorySpy.mockRestore()
      sendUserMessageSpy.mockRestore()
    })

    it('adds labels', async () => {
      await pullRequestLabeled(payload)
      expect(addLabelsSpy).toHaveBeenCalledWith('actions', 493, [
        PleaseReviewLabel,
      ])
    })

    it('does nothing if the event was triggered by another Github action', async () => {
      const automatedPayload = {
        ...payload,
        sender: {
          login: GithubWriteUser,
        },
      } as unknown as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(automatedPayload)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it('assigns owners', async () => {
      const assignReviewersSpy = jest.spyOn(Github, 'assignReviewers')
      const dependabotPayload = {
        ...payload,
        label: {
          name: DependenciesLabel,
        },
      } as unknown as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(dependabotPayload)
      expect(assignReviewersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        493,
        ['wycats']
      )
      expect(addLabelsSpy).toHaveBeenCalledWith(payload.repository.name, 493, [
        DependenciesLabel,
        PleaseReviewLabel,
      ])
      assignReviewersSpy.mockRestore()
    })

    it('assigns reviewers to dependabot PRs', async () => {
      const assignOwnersSpy = jest.spyOn(Github, 'assignOwners')
      const dependabotPayload = {
        ...payload,
        label: {
          name: SecurityLabel,
        },
      } as unknown as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(dependabotPayload)
      expect(assignOwnersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        493,
        ['dhh']
      )
      assignOwnersSpy.mockRestore()
    })

    describe('security label', () => {
      const securityPayload = {
        ...payload,
        label: {
          name: SecurityLabel,
        },
      } as unknown as Schema.PullRequestLabeledEvent

      it('assigns a priority', async () => {
        await pullRequestLabeled(securityPayload)
        expect(addLabelsSpy).toHaveBeenCalledWith('actions', 493, [
          SecurityLabel,
          PriorityHighLabel,
        ])
      })

      it('sends a slack message to the lead', async () => {
        await pullRequestLabeled(securityPayload)
        const message =
          ':warning: Please review the security issue *<https://example.com/|actions#493 (Fix the widget)>* ' +
          'and assign a priority of either `p1` (high), `p2` (medium) or `p3` (low). SLAs apply to this pull request, ' +
          'and we need to resolve it in a timely manner.'
        expect(sendUserMessageSpy).toHaveBeenCalledWith(
          mockRepository.leads[0].slack_id,
          message
        )
      })

      it('does nothing if the PR has already been prioritized', async () => {
        const prioritizedPayload = {
          ...securityPayload,
          pull_request: {
            ...securityPayload.pull_request,
            labels: [
              {
                name: 'p1',
              },
            ],
          },
        } as unknown as Schema.PullRequestLabeledEvent
        await pullRequestLabeled(prioritizedPayload)
        expect(addLabelsSpy).toHaveBeenCalledWith('actions', 493, [
          SecurityLabel,
        ])
        expect(sendUserMessageSpy).toHaveBeenCalledTimes(0)
      })
    })
  })
})
