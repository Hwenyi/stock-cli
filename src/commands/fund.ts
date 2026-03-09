import type { StockSDK } from 'stock-sdk'

import { printJson } from '../output/format'
import type { CommandContext } from '../types'

function normalizeFundCodes(operands: string[]): string[] {
  return operands.map((code) => {
    const normalized = code.trim()

    if (!/^\d{6}$/.test(normalized)) {
      throw new Error(`Invalid fund code: ${code}. Expected 6 digits.`)
    }

    return normalized
  })
}

export async function runFundCommand(sdk: StockSDK, operands: string[], context: CommandContext): Promise<void> {
  const normalizedCodes = normalizeFundCodes(operands)
  const quotes = await sdk.getFundQuotes(normalizedCodes)

  void context
  printJson(quotes)
}