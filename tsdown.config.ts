import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: 'esm',
  outDir: 'dist/tsdown',
  clean: true,
  minify: false,
  sourcemap: false,
  shims: true,
  platform: 'node',
  deps: {
    alwaysBundle: ['stock-sdk'],
  },
  exe: {
    fileName: 'stock-cli-tsdown',
    seaConfig: {
      disableExperimentalSEAWarning: true,
      useCodeCache: false,
      useSnapshot: false,
    },
  },
})
