import type { StockSDK } from 'stock-sdk'

import { printJson } from '../output/format'
import type { CommandContext } from '../types'

function normalizeUSCodes(codes: string[]): string[] {
  return codes.map((code) => {
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z][A-Z0-9.-]*$/.test(normalized)) {
      throw new Error(`Invalid US code: ${code}. Expected a ticker like AAPL or BRK.B.`)
    }

    return normalized
  })
}

export async function runUSCommand(sdk: StockSDK, operands: string[], context: CommandContext): Promise<void> {
  const normalizedCodes = normalizeUSCodes(operands)
  const quotes = await sdk.getUSQuotes(normalizedCodes)

  void context
  printJson(quotes)
}