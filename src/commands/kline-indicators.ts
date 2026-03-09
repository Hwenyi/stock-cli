import type { StockSDK } from 'stock-sdk'

import { printJson } from '../output/format'

import type { CommandContext, KlineIndicatorsCommandOptions } from '../types'

import { ensureDateOrder, normalizeAutoDetectedKlineSymbol, normalizeKlineSymbolByMarket, toSdkMarket } from './kline-utils'

function hasSelectedIndicators(options: KlineIndicatorsCommandOptions): boolean {
  return Object.keys(options.indicators).length > 0
}

function normalizeIndicatorSymbol(symbol: string, market: KlineIndicatorsCommandOptions['market']): string {
  if (market) {
    return normalizeKlineSymbolByMarket(symbol, market)
  }

  return normalizeAutoDetectedKlineSymbol(symbol)
}

export async function runKlineIndicatorsCommand(
  sdk: StockSDK,
  operands: string[],
  options: KlineIndicatorsCommandOptions,
  context: CommandContext,
): Promise<void> {
  if (operands.length !== 1) {
    throw new Error('Kline-indicators command expects exactly 1 operand: <symbol>.')
  }

  if (!hasSelectedIndicators(options)) {
    throw new Error('Kline-indicators command requires at least one indicator option such as --ma or --macd.')
  }

  ensureDateOrder(options)

  const symbol = normalizeIndicatorSymbol(operands[0], options.market)
  const result = await sdk.getKlineWithIndicators(symbol, {
    market: options.market ? toSdkMarket(options.market) : undefined,
    period: options.period,
    adjust: options.adjust,
    startDate: options.startDate,
    endDate: options.endDate,
    indicators: options.indicators,
  })

  void context
  printJson(result)
}