import { stat } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { spawn } from 'node:child_process'

import { parse as parseYaml } from 'yaml'

type BuildRoute = {
  name: 'bun-direct' | 'tsdown-bun'
  buildCommand: string[]
  binaryPath: string
}

type CommandCase = {
  name: string
  args: string[]
  expectExitCode: number
  validate: (result: CommandResult) => void
}

type StructuredOutputFormat = 'yaml' | 'json'

type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

type RouteReport = {
  route: BuildRoute['name']
  binaryPath: string
  sizeBytes: number
  sizeMB: string
  coldStartMs: number
  hotStartAverageMs: number
  stabilityFailures: number
  offlineChecks: TestOutcome[]
  onlineChecks: TestOutcome[]
}

type TestOutcome = {
  name: string
  passed: boolean
  durationMs: number
  details: string
}

const root = process.cwd()

const routes: BuildRoute[] = [
  {
    name: 'bun-direct',
    buildCommand: ['bun', 'run', 'build:bun'],
    binaryPath: 'dist/bin/stock-cli',
  },
  {
    name: 'tsdown-bun',
    buildCommand: ['bun', 'run', 'build:tsdown'],
    binaryPath: 'dist/tsdown/stock-cli-tsdown',
  },
]

const offlineCases: CommandCase[] = [
  {
    name: 'help output',
    args: ['help'],
    expectExitCode: 0,
    validate: ({ stdout }) => {
      if (!stdout.includes('stock-cli') || !stdout.includes('Usage:') || !stdout.includes('--yaml') || !stdout.includes('--json')) {
        throw new Error('help output missing expected usage text')
      }
    },
  },
  {
    name: 'invalid A-share code',
    args: ['a', 'badcode'],
    expectExitCode: 1,
    validate: ({ stderr }) => {
      if (!stderr.includes('Invalid A-share code')) {
        throw new Error('missing invalid A-share code error message')
      }
    },
  },
  {
    name: 'missing indicator selection',
    args: ['kline-indicators', 'sz000001'],
    expectExitCode: 1,
    validate: ({ stderr }) => {
      if (!stderr.includes('requires at least one indicator option')) {
        throw new Error('missing kline-indicators validation error')
      }
    },
  },
]

const onlineCases: CommandCase[] = [
  {
    name: 'A-share quote YAML',
    args: ['a', 'sh600519'],
    expectExitCode: 0,
    validate: ({ stdout }) => {
      const data = parseStructuredOutput(stdout, 'yaml')
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('expected a non-empty YAML array for A-share quotes')
      }
    },
  },
  {
    name: 'search JSON fallback',
    args: ['search', 'maotai', '--json'],
    expectExitCode: 0,
    validate: ({ stdout }) => {
      const data = parseStructuredOutput(stdout, 'json')
      if (!Array.isArray(data)) {
        throw new Error('expected a JSON array for search results')
      }
    },
  },
  {
    name: 'kline indicators YAML',
    args: ['kline-indicators', 'sz000001', '--start', '20240101', '--end', '20240131', '--ma'],
    expectExitCode: 0,
    validate: ({ stdout }) => {
      const data = parseStructuredOutput(stdout, 'yaml')
      if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
        throw new Error('expected a non-empty YAML array for kline indicators')
      }
    },
  },
]

function parseStructuredOutput(stdout: string, format: StructuredOutputFormat): unknown {
  return format === 'json' ? JSON.parse(stdout) : parseYaml(stdout)
}

async function runCommand(command: string[], timeoutMs = 30000): Promise<CommandResult> {
  const [file, ...args] = command
  const startedAt = performance.now()

  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      cwd: root,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command.join(' ')}`))
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    child.on('close', (exitCode) => {
      clearTimeout(timer)
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
        durationMs: performance.now() - startedAt,
      })
    })
  })
}

async function runCase(binaryPath: string, testCase: CommandCase): Promise<TestOutcome> {
  try {
    const result = await runCommand([binaryPath, ...testCase.args])

    if (result.exitCode !== testCase.expectExitCode) {
      throw new Error(`expected exit code ${testCase.expectExitCode}, received ${result.exitCode}`)
    }

    testCase.validate(result)

    return {
      name: testCase.name,
      passed: true,
      durationMs: result.durationMs,
      details: `exit=${result.exitCode}`,
    }
  } catch (error) {
    return {
      name: testCase.name,
      passed: false,
      durationMs: 0,
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

async function measureHotAverage(binaryPath: string): Promise<number> {
  const samples: number[] = []

  for (let index = 0; index < 3; index += 1) {
    const result = await runCommand([binaryPath, 'a', 'sh600519'])
    if (result.exitCode !== 0) {
      throw new Error(`hot-start sample failed with exit=${result.exitCode}`)
    }
    parseStructuredOutput(result.stdout, 'yaml')
    samples.push(result.durationMs)
  }

  return samples.reduce((sum, value) => sum + value, 0) / samples.length
}

async function measureStability(binaryPath: string): Promise<number> {
  let failures = 0

  for (let index = 0; index < 5; index += 1) {
    const result = await runCommand([binaryPath, 'a', 'sh600519'])
    if (result.exitCode !== 0) {
      failures += 1
      continue
    }

    try {
      const data = parseStructuredOutput(result.stdout, 'yaml')
      if (!Array.isArray(data) || data.length === 0) {
        failures += 1
      }
    } catch {
      failures += 1
    }
  }

  return failures
}

function formatMs(value: number): string {
  return `${value.toFixed(0)} ms`
}

function formatOutcome(outcomes: TestOutcome[]): string {
  return outcomes
    .map((outcome) => `- ${outcome.passed ? 'PASS' : 'FAIL'} ${outcome.name}: ${outcome.details}${outcome.passed ? `, ${formatMs(outcome.durationMs)}` : ''}`)
    .join('\n')
}

function recommend(reports: RouteReport[]): string {
  const bunReport = reports.find((report) => report.route === 'bun-direct')
  const tsdownReport = reports.find((report) => report.route === 'tsdown-bun')

  if (!bunReport || !tsdownReport) {
    throw new Error('missing report data for recommendation')
  }

  const bunPassed = bunReport.offlineChecks.every((item) => item.passed) && bunReport.onlineChecks.every((item) => item.passed)
  const tsdownPassed = tsdownReport.offlineChecks.every((item) => item.passed) && tsdownReport.onlineChecks.every((item) => item.passed)

  if (bunPassed && !tsdownPassed) {
    return '推荐 bun-direct：功能验证通过，tsdown-bun 存在失败。'
  }

  if (tsdownPassed && !bunPassed) {
    return '推荐 tsdown-bun：功能验证通过，bun-direct 存在失败。'
  }

  const sizeRatio = tsdownReport.sizeBytes / bunReport.sizeBytes
  const coldDiffMs = bunReport.coldStartMs - tsdownReport.coldStartMs

  if (bunPassed && tsdownPassed && sizeRatio >= 1.5 && coldDiffMs < 100) {
    return '推荐 bun-direct：两条路线功能都通过，但 bun-direct 产物显著更小，冷启动差距不足以抵消体积和链路复杂度。'
  }

  return '推荐 tsdown-bun：在当前测试中启动耗时更优，且没有功能回归。'
}

function buildMarkdown(reports: RouteReport[]): string {
  const summaryRows = reports
    .map((report) => `| ${report.route} | ${report.sizeMB} | ${formatMs(report.coldStartMs)} | ${formatMs(report.hotStartAverageMs)} | ${report.stabilityFailures}/5 |`)
    .join('\n')

  const details = reports
    .map((report) => {
      return `## ${report.route}\n\nBinary: ${report.binaryPath}\n\n离线测试\n${formatOutcome(report.offlineChecks)}\n\n在线测试\n${formatOutcome(report.onlineChecks)}\n`
    })
    .join('\n')

  return `# Packaging Benchmark\n\n## Summary\n\n| Route | Binary Size | Cold Start | Hot Start Avg | Stability Failures |\n| --- | --- | --- | --- | --- |\n${summaryRows}\n\n## Recommendation\n\n${recommend(reports)}\n\n## Test Set\n\n- 离线冒烟：help 输出、无效 A 股代码校验、kline-indicators 缺少指标校验\n- 在线验收：默认 YAML 的 A 股行情与 kline-indicators，以及显式 JSON 的 search 回退路径\n- 稳定性：连续 5 次执行 a sh600519，统计失败数\n\n## Details\n\n${details}`
}

async function buildRoute(route: BuildRoute): Promise<RouteReport> {
  const buildResult = await runCommand(route.buildCommand, 120000)
  if (buildResult.exitCode !== 0) {
    throw new Error(`${route.name} build failed: ${buildResult.stderr || buildResult.stdout}`)
  }

  const binaryStats = await stat(route.binaryPath)
  const offlineChecks = await Promise.all(offlineCases.map((testCase) => runCase(route.binaryPath, testCase)))

  const coldStart = await runCommand([route.binaryPath, 'a', 'sh600519'])
  if (coldStart.exitCode !== 0) {
    throw new Error(`${route.name} cold start failed: ${coldStart.stderr || coldStart.stdout}`)
  }
  parseStructuredOutput(coldStart.stdout, 'yaml')

  const onlineChecks = await Promise.all(onlineCases.map((testCase) => runCase(route.binaryPath, testCase)))
  const hotStartAverageMs = await measureHotAverage(route.binaryPath)
  const stabilityFailures = await measureStability(route.binaryPath)

  return {
    route: route.name,
    binaryPath: route.binaryPath,
    sizeBytes: binaryStats.size,
    sizeMB: `${(binaryStats.size / 1024 / 1024).toFixed(1)} MB`,
    coldStartMs: coldStart.durationMs,
    hotStartAverageMs,
    stabilityFailures,
    offlineChecks,
    onlineChecks,
  }
}

async function main(): Promise<void> {
  const reports: RouteReport[] = []

  for (const route of routes) {
    console.log(`Running packaging checks for ${route.name}...`)
    reports.push(await buildRoute(route))
  }

  const markdown = buildMarkdown(reports)
  await Bun.write('docs/BENCHMARK.md', markdown)

  console.log(markdown)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})