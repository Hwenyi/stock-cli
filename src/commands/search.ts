import type { StockSDK } from 'stock-sdk'

import { printOutput } from '../output/format'
import type { CommandContext } from '../types'

function normalizeKeyword(operands: string[]): string {
  const keyword = operands.join(' ').trim()

  if (!keyword) {
    throw new Error('Search keyword cannot be empty.')
  }

  return keyword
}

export async function runSearchCommand(sdk: StockSDK, operands: string[], context: CommandContext): Promise<void> {
  const keyword = normalizeKeyword(operands)
  const results = await sdk.search(keyword)

  printOutput(results, context.options.outputFormat)
}