import { join } from 'path'

import { checkRunCompleted } from '@sr-actions/check-run-completed-action/checkRunCompleted'

jest.mock('@sr-actions/check-run-completed-action/checkRunCompleted')

describe('check-run-completed-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to close the pull request', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'check-run-failed-payload.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(checkRunCompleted).toHaveBeenCalled()
  })
})
