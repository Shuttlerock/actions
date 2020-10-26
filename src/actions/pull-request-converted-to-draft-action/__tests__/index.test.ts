import { join } from 'path'

import { pullRequestConvertedToDraft } from '@sr-actions/pull-request-converted-to-draft-action/pullRequestConvertedToDraft'

jest.mock(
  '@sr-actions/pull-request-converted-to-draft-action/pullRequestConvertedToDraft'
)

describe('pull-request-converted-to-draft-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to process the pull request', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'pull-request-converted-to-draft.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(pullRequestConvertedToDraft).toHaveBeenCalled()
  })
})
