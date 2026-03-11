import { stringify } from 'yaml'

import type { OutputFormat } from '../types'

function ensureTrailingNewline(text: string): string {
  return text.endsWith('\n') ? text : `${text}\n`
}

export function formatOutput(data: unknown, format: OutputFormat): string {
  if (format === 'json') {
    return ensureTrailingNewline(JSON.stringify(data, null, 2))
  }

  return ensureTrailingNewline(stringify(data, {
    indent: 2,
  }))
}

export function printOutput(data: unknown, format: OutputFormat): void {
  process.stdout.write(formatOutput(data, format))
}