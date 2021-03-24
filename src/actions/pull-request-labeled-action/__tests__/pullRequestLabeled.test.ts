import Schema from '@octokit/webhooks-definitions/schema'

import rawPayload from '@sr-actions/pull-request-labeled-action/__tests__/fixtures/pull-request-labeled.json'
import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'
import {
  DependenciesLabel,
  GithubWriteUser,
  PleaseReviewLabel,
  SecurityLabel,
} from '@sr-services/Constants'
import * as Credentials from '@sr-services/Credentials'
import * as Github from '@sr-services/Github'
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
}))

describe('pull-request-labeled-action', () => {
  describe('pullRequestLabeled', () => {
    let addLabelsSpy: jest.SpyInstance
    let fetchRepositorySpy: jest.SpyInstance

    // Cast this via 'unknown' to avoid having to fill in a bunch of unused payload fields.
    const payload = (rawPayload as unknown) as Schema.PullRequestLabeledEvent

    beforeEach(() => {
      addLabelsSpy = jest
        .spyOn(Github, 'addLabels')
        .mockReturnValue(Promise.resolve([]))
      fetchRepositorySpy = jest
        .spyOn(Credentials, 'fetchRepository')
        .mockReturnValue(Promise.resolve(mockRepository))
    })

    afterEach(() => {
      addLabelsSpy.mockRestore()
      fetchRepositorySpy.mockRestore()
    })

    it('does nothing if the label is not relevant', async () => {
      await pullRequestLabeled(payload)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it('does nothing if the event was triggered by another Github action', async () => {
      const automatedPayload = ({
        ...payload,
        sender: {
          login: GithubWriteUser,
        },
      } as unknown) as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(automatedPayload)
      expect(addLabelsSpy).toHaveBeenCalledTimes(0)
    })

    it('assigns owners', async () => {
      const assignReviewersSpy = jest.spyOn(Github, 'assignReviewers')
      const dependabotPayload = ({
        ...payload,
        label: {
          name: DependenciesLabel,
        },
      } as unknown) as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(dependabotPayload)
      expect(assignReviewersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        136,
        ['wycats']
      )
      expect(addLabelsSpy).toHaveBeenCalledWith(payload.repository.name, 136, [
        DependenciesLabel,
        PleaseReviewLabel,
      ])
      assignReviewersSpy.mockRestore()
    })

    it('assigns reviewers to dependabot PRs', async () => {
      const assignOwnersSpy = jest.spyOn(Github, 'assignOwners')
      const dependabotPayload = ({
        ...payload,
        label: {
          name: SecurityLabel,
        },
      } as unknown) as Schema.PullRequestLabeledEvent
      await pullRequestLabeled(dependabotPayload)
      expect(assignOwnersSpy).toHaveBeenCalledWith(
        payload.repository.name,
        136,
        ['dhh']
      )
      assignOwnersSpy.mockRestore()
    })
  })
})
