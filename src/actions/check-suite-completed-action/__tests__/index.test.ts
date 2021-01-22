import { join } from 'path'

import { checkSuiteCompleted } from '@sr-actions/check-suite-completed-action/checkSuiteCompleted'

jest.mock('@sr-actions/check-suite-completed-action/checkSuiteCompleted')

describe('check-suite-completed-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('calls the method to handle the suite result', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'check-suite-failed-payload.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(checkSuiteCompleted).toHaveBeenCalled()
  })
})
