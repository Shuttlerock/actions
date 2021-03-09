import { error, setFailed } from '@actions/core'
import { context } from '@actions/github'
import Schema from '@octokit/webhooks-definitions/schema'
import { pullRequestCommentedOn } from '@sr-actions/pull-request-commented-on/pullRequestCommentedOn'

export const run = async (): Promise<void> => {
  const { payload } = ((await context) as unknown) as {
    payload: Schema.IssueCommentCreatedEvent
  }
  if (!payload) {
    error('FOo')
  }
}

run().catch(err => {
  error(err)
  error(err.stack)
  setFailed(err.message)
})
