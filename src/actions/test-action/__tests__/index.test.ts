import {execSync, ExecSyncOptions} from 'child_process'
import {join} from 'path'
import * as process from 'process'

import {wait} from '@sr-actions/test-action/wait'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 50 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  const delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env.INPUT_MILLISECONDS = '500'
  const ip = join(process.cwd(), 'build', 'actions', 'test-action', 'index.js')
  const options: ExecSyncOptions = {
    env: process.env,
  }
  // eslint-disable-next-line no-console
  console.log(execSync(`node ${ip}`, options).toString())
})
