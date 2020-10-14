import { join } from 'path'

import { rebase } from '@sr-services/Ggithub/Rebase'

jest.mock('@sr-services/Ggithub/Rebase')

describe('rebase-epic-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('does nothing if we are dealing with a non-epic PR', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'synchronize-non-epic.json'
    )
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const { run } = require('../index')
    await run()
    expect(rebase).toHaveBeenCalledTimes(0)
  })
})
