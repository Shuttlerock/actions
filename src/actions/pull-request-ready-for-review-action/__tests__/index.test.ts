import { join } from 'path'

import { pullRequestReadyForReview } from '@sr-actions/pull-request-ready-for-review-action/pullRequestReadyForReview'

jest.mock(
  '@sr-actions/pull-request-ready-for-review-action/pullRequestReadyForReview'
)

describe('pull-request-ready-for-review-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to close the pull request', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'pull-request-ready-for-review.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(pullRequestReadyForReview).toHaveBeenCalled()
  })
})
