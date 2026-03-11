import type { StockSDK } from 'stock-sdk'

import { printOutput } from '../output/format'

import type { CommandContext, KlineCommandOptions, KlineMarket } from '../types'
import { ensureDateOrder, normalizeAHistorySymbol, normalizeHKHistorySymbol, normalizeMarket, normalizeUSHistorySymbol } from './kline-utils'

export async function runKlineCommand(
  sdk: StockSDK,
  operands: string[],
  options: KlineCommandOptions,
  context: CommandContext,
): Promise<void> {
  if (operands.length < 2) {
    throw new Error('Kline command requires both market and symbol.')
  }

  const market = normalizeMarket(operands[0])
  const symbol = operands[1]
  ensureDateOrder(options)

  if (market === 'a') {
    const result = await sdk.getHistoryKline(normalizeAHistorySymbol(symbol), options)
    printOutput(result, context.options.outputFormat)
    return
  }

  if (market === 'hk') {
    const result = await sdk.getHKHistoryKline(normalizeHKHistorySymbol(symbol), options)
    printOutput(result, context.options.outputFormat)
    return
  }

  const result = await sdk.getUSHistoryKline(normalizeUSHistorySymbol(symbol), options)
  printOutput(result, context.options.outputFormat)
}