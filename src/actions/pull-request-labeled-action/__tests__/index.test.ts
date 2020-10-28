import { join } from 'path'

import { pullRequestLabeled } from '@sr-actions/pull-request-labeled-action/pullRequestLabeled'

jest.mock('@sr-actions/pull-request-labeled-action/pullRequestLabeled')

describe('pull-request-labeled-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to process the pull request', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'pull-request-labeled.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(pullRequestLabeled).toHaveBeenCalled()
  })
})
