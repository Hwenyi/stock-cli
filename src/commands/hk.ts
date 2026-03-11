import type { StockSDK } from 'stock-sdk'

import { printOutput } from '../output/format'
import type { CommandContext } from '../types'

function normalizeHKCodes(codes: string[]): string[] {
  return codes.map((code) => {
    const trimmed = code.trim()
    if (!/^\d{1,5}$/.test(trimmed)) {
      throw new Error(`Invalid HK code: ${code}. Expected 1 to 5 digits.`)
    }

    return trimmed.padStart(5, '0')
  })
}

export async function runHKCommand(sdk: StockSDK, operands: string[], context: CommandContext): Promise<void> {
  const normalizedCodes = normalizeHKCodes(operands)
  const quotes = await sdk.getHKQuotes(normalizedCodes)

  printOutput(quotes, context.options.outputFormat)
}