import { join } from 'path'

import { pullRequestClosed } from '@sr-actions/pull-request-closed-action/pullRequestClosed'

jest.mock('@sr-actions/pull-request-closed-action/pullRequestClosed')

describe('pull-request-closed-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to close the pull request', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'pull-request-closed.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(pullRequestClosed).toHaveBeenCalled()
  })
})
