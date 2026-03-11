type CommandCase = {
  name: string
  args: string[]
  expectedExitCode: number
  validate: (stdout: string, stderr: string) => void
}

const binaryPath = process.argv[2] ?? 'dist/bin/stock-cli'

const cases: CommandCase[] = [
  {
    name: 'help output',
    args: ['help'],
    expectedExitCode: 0,
    validate: (stdout) => {
      if (!stdout.includes('stock-cli') || !stdout.includes('Usage:') || !stdout.includes('--yaml') || !stdout.includes('--json')) {
        throw new Error('help output missing expected text')
      }
    },
  },
  {
    name: 'invalid A-share validation',
    args: ['a', 'badcode'],
    expectedExitCode: 1,
    validate: (_stdout, stderr) => {
      if (!stderr.includes('Invalid A-share code')) {
        throw new Error('invalid A-share validation did not trigger')
      }
    },
  },
  {
    name: 'missing indicator validation',
    args: ['kline-indicators', 'sz000001'],
    expectedExitCode: 1,
    validate: (_stdout, stderr) => {
      if (!stderr.includes('requires at least one indicator option')) {
        throw new Error('missing indicator validation did not trigger')
      }
    },
  },
]

for (const testCase of cases) {
  const result = Bun.spawnSync([binaryPath, ...testCase.args], {
    stderr: 'pipe',
    stdout: 'pipe',
  })

  const stdout = result.stdout.toString()
  const stderr = result.stderr.toString()

  if (result.exitCode !== testCase.expectedExitCode) {
    throw new Error(`${testCase.name} expected exit ${testCase.expectedExitCode}, received ${result.exitCode}`)
  }

  testCase.validate(stdout, stderr)
  console.log(`PASS ${testCase.name}`)
}