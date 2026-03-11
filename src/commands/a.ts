import type { StockSDK } from 'stock-sdk'

import { printOutput } from '../output/format'
import type { CommandContext } from '../types'

function normalizeAShareCodes(operands: string[]): string[] {
  return operands.map((code) => {
    const normalized = code.trim().toLowerCase()

    if (!/^(sh|sz|bj)\d{6}$/.test(normalized)) {
      throw new Error(`Invalid A-share code: ${code}. Expected sh/sz/bj followed by 6 digits.`)
    }

    return normalized
  })
}

export async function runAShareCommand(sdk: StockSDK, operands: string[], context: CommandContext): Promise<void> {
  const normalizedCodes = normalizeAShareCodes(operands)
  const quotes = await sdk.getSimpleQuotes(normalizedCodes)

  printOutput(quotes, context.options.outputFormat)
}