import {
  IssuesAddAssigneesResponseData,
  OctokitResponse,
  PullsCreateResponseData,
  PullsGetResponseData,
} from '@octokit/types'
import { EventPayloads } from '@octokit/webhooks'

import * as Client from '@sr-services/Github/Client'
import { Branch, Repository } from '@sr-services/Github/Git'
import {
  assignOwners,
  createPullRequest,
  getIssueKey,
  getPullRequest,
  pullRequestUrl,
} from '@sr-services/Github/PullRequest'
import { organizationName } from '@sr-services/Inputs'
import {
  mockGithubPullRequestCreateResponse,
  mockGithubPullRequest,
  mockIssuesAddAssigneesResponseData,
} from '@sr-tests/Mocks'

interface GetPullParams {
  owner: string
  pull_number: number
  repo: Repository
}

const pull_number = mockGithubPullRequest.number
const repo = 'my-repo'
const fetchPullParams = {
  owner: organizationName(),
  pull_number,
  repo,
}

describe('PullRequest', () => {
  describe('assignOwners', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(Client.client.issues, 'addAssignees')
        .mockImplementation(
          (_args?: {
            assignees?: string[]
            issue_number: number
            owner: string
            repo: Repository
          }) =>
            Promise.resolve({
              data: mockIssuesAddAssigneesResponseData,
            } as OctokitResponse<IssuesAddAssigneesResponseData>)
        )
      const result = await assignOwners(repo, 23, ['dperrett'])
      expect(spy).toHaveBeenCalledWith({
        assignees: ['dperrett'],
        issue_number: 23,
        owner: organizationName(),
        repo,
      })
      expect(result.id).toEqual(1234)
      spy.mockRestore()
    })
  })

  describe('createPullRequest', () => {
    it('calls the Github API', async () => {
      const clientSpy = jest
        .spyOn(Client, 'clientForToken')
        .mockImplementation((_token: string) => Client.client)
      const spy = jest
        .spyOn(Client.client.pulls, 'create')
        .mockImplementation(
          (_args?: {
            base: Branch
            body?: string
            draft?: boolean
            head: Branch
            owner: string
            repo: Repository
            title: string
          }) =>
            Promise.resolve({
              data: mockGithubPullRequestCreateResponse,
            } as OctokitResponse<PullsCreateResponseData>)
        )
      const result = await createPullRequest(
        repo,
        'master',
        'feature/add-a-widget',
        'Add a Widget',
        'Some description',
        'my-token'
      )
      expect(spy).toHaveBeenCalledWith({
        base: 'master',
        body: 'Some description',
        draft: true,
        head: 'feature/add-a-widget',
        owner: organizationName(),
        repo,
        title: 'Add a Widget',
      })
      expect(result.id).toEqual(1234)
      clientSpy.mockRestore()
      spy.mockRestore()
    })
  })

  describe('getIssueKey', () => {
    it('gets the key from the title if possible', () => {
      const pullRequest = ({
        body:
          '[Jira Tech task](https://example.atlassian.net/browse/ISSUE-789)',
        title: '[ISSUE-456] My Issue',
      } as unknown) as EventPayloads.WebhookPayloadPullRequestPullRequest
      expect(getIssueKey(pullRequest)).toEqual('ISSUE-456')
    })

    it('gets the key from the body if possible', () => {
      const pullRequest = ({
        body:
          '[Jira Tech task](https://example.atlassian.net/browse/ISSUE-789)',
        title: 'My Issue',
      } as unknown) as EventPayloads.WebhookPayloadPullRequestPullRequest
      expect(getIssueKey(pullRequest)).toEqual('ISSUE-789')
    })

    it("returns undefined if the key can't be found", () => {
      const pullRequest = ({
        body: 'My body',
        title: 'My Issue',
      } as unknown) as EventPayloads.WebhookPayloadPullRequestPullRequest
      expect(getIssueKey(pullRequest)).toBeUndefined()
    })
  })

  describe('getPullRequest', () => {
    it('calls the Github API', async () => {
      const spy = jest
        .spyOn(Client.readClient.pulls, 'get')
        .mockImplementation((_args?: GetPullParams) =>
          Promise.resolve({
            data: mockGithubPullRequest,
          } as OctokitResponse<PullsGetResponseData>)
        )
      const result = await getPullRequest(repo, pull_number)
      expect(spy).toHaveBeenCalledWith(fetchPullParams)
      expect(result?.number).toEqual(pull_number)
      spy.mockRestore()
    })

    it("returns undefined if the branch can't be found", async () => {
      const spy = jest
        .spyOn(Client.readClient.pulls, 'get')
        .mockImplementation((_args?: GetPullParams) => {
          throw new Error('Pull request not found')
        })
      const result = await getPullRequest(repo, pull_number)
      expect(spy).toHaveBeenCalledWith(fetchPullParams)
      expect(result).toEqual(undefined)
      spy.mockRestore()
    })
  })

  describe('pullRequestUrl', () => {
    it('returns the URL', () => {
      const expected = 'https://github.com/octokit/actions/pull/123'
      expect(pullRequestUrl('actions', 123)).toEqual(expected)
    })
  })
})
