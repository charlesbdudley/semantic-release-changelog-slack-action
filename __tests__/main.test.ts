import { wait } from '../src/wait'
import * as process from 'process'
import * as cp from 'child_process'
import * as path from 'path'

test('throws invalid number', async () => {
  const input = parseInt('foo', 10)
  await expect(wait(input)).rejects.toThrow('milliseconds not a number')
})

test('wait 500 ms', async () => {
  const start = new Date()
  await wait(500)
  const end = new Date()
  var delta = Math.abs(end.getTime() - start.getTime())
  expect(delta).toBeGreaterThan(450)
})

// shows how the runner will run a javascript action with env / stdout protocol
test('test runs', () => {
  process.env['INPUT_SERVICE-NAME'] = 'credit-service'
  process.env['INPUT_SLACK-WEBHOOK-URL'] =
    'https://hooks.slack.com/services/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'
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecSyncOptions = {
    env: process.env
  }

  console.log(cp.execSync(`node ${ip}`, options).toString())
})
