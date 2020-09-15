import {join} from 'path'

import {rebase} from '@sr-services/github/Rebase'

jest.mock('@sr-services/github/Rebase')

describe('rebase-epic-action', () => {
  afterAll(() => jest.restoreAllMocks())

  it('rebases we are dealing with an [Epic] PR', async () => {
    process.env.GITHUB_EVENT_PATH = join(
      __dirname,
      'fixtures',
      'synchronize-epic.json'
    )
    const {run} = require('../index')
    await run()
    expect(rebase).toHaveBeenCalled()
  })
})
