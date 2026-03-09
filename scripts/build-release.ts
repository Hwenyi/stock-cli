import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type PackageJson = {
  version: string
}

type ReleaseTarget = {
  target: string
  artifactSuffix: string
  extension: string
  notes?: string
}

const root = process.cwd()
const releaseDir = join(root, 'dist', 'releases')
const packageJson = (await Bun.file(join(root, 'package.json')).json()) as PackageJson

const releaseTargets: ReleaseTarget[] = [
  {
    target: 'bun-darwin-arm64',
    artifactSuffix: 'darwin-arm64',
    extension: '',
  },
  {
    target: 'bun-windows-x64-baseline',
    artifactSuffix: 'windows-x64',
    extension: '.exe',
    notes: 'Built with the baseline target for broader x64 CPU compatibility on Windows.',
  },
]

await rm(releaseDir, { force: true, recursive: true })
await mkdir(releaseDir, { recursive: true })


const manifest: {
  version: string
  assets: Array<{
    fileName: string
    target: string
    sha256File: string
    notes?: string
  }>
} = {
  version: packageJson.version,
  assets: [],
}

for (const releaseTarget of releaseTargets) {
  const fileName = `stock-cli-${packageJson.version}-${releaseTarget.artifactSuffix}${releaseTarget.extension}`
  const binaryPath = join(releaseDir, fileName)

  const build = Bun.spawnSync([
    'bun',
    'build',
    'src/cli.ts',
    '--compile',
    '--minify',
    '--target',
    releaseTarget.target,
    '--outfile',
    binaryPath,
  ], {
    cwd: root,
    stderr: 'pipe',
    stdout: 'pipe',
  })

  if (build.exitCode !== 0) {
    const message = build.stderr.toString() || build.stdout.toString() || `bun build failed for ${releaseTarget.target}`
    throw new Error(message)
  }

  const binaryBuffer = Buffer.from(await Bun.file(binaryPath).arrayBuffer())
  const checksum = createHash('sha256').update(binaryBuffer).digest('hex')
  const checksumFileName = `${fileName}.sha256`

  await writeFile(join(releaseDir, checksumFileName), `${checksum}  ${fileName}\n`)

  manifest.assets.push({
    fileName,
    target: releaseTarget.target,
    sha256File: checksumFileName,
    notes: releaseTarget.notes,
  })

  console.log(`Built release asset: ${fileName}`)
}

await writeFile(join(releaseDir, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)