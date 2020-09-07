import * as cp from 'child_process'
import * as path from 'path'
import * as process from 'process'

import {wait} from '@sr-actions/test-action/wait'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  const delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env.INPUT_MILLISECONDS = '500'
  const ip = path.join(
    process.cwd(),
    'lib',
    'actions',
    'test-action',
    'index.js'
  )
  const options: cp.ExecSyncOptions = {
    env: process.env,
  }
  // eslint-disable-next-line no-console
  console.log(cp.execSync(`node ${ip}`, options).toString())
})
