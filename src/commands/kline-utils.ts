import type { MarketType } from 'stock-sdk'

import type { KlineCommandOptions, KlineMarket } from '../types'

export function normalizeAHistorySymbol(symbol: string): string {
  const normalized = symbol.trim().toLowerCase()

  if (/^\d{6}$/.test(normalized)) {
    return normalized
  }

  if (/^(sh|sz|bj)\d{6}$/.test(normalized)) {
    return normalized
  }

  throw new Error(`Invalid A-share kline symbol: ${symbol}. Expected 6 digits or sh/sz/bj followed by 6 digits.`)
}

export function normalizeHKHistorySymbol(symbol: string): string {
  const normalized = symbol.trim()

  if (!/^\d{1,5}$/.test(normalized)) {
    throw new Error(`Invalid HK kline symbol: ${symbol}. Expected 1 to 5 digits.`)
  }

  return normalized.padStart(5, '0')
}

export function normalizeUSHistorySymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase()
  const match = /^(105|106|107)\.([A-Z][A-Z0-9.-]*)$/.exec(normalized)

  if (!match) {
    throw new Error(`Invalid US kline symbol: ${symbol}. Expected format like 105.AAPL or 106.BABA.`)
  }

  return `${match[1]}.${match[2]}`
}

export function normalizeMarket(value: string | undefined): KlineMarket {
  if (value === 'a' || value === 'hk' || value === 'us') {
    return value
  }

  throw new Error(`Invalid kline market: ${value ?? ''}. Expected one of a, hk, us.`)
}

export function ensureDateOrder(options: KlineCommandOptions): void {
  if (options.startDate && options.endDate && options.startDate > options.endDate) {
    throw new Error('Invalid kline date range: --start must be earlier than or equal to --end.')
  }
}

export function toSdkMarket(market: KlineMarket): MarketType {
  if (market === 'a') {
    return 'A'
  }

  if (market === 'hk') {
    return 'HK'
  }

  return 'US'
}

export function normalizeAutoDetectedKlineSymbol(symbol: string): string {
  const trimmed = symbol.trim()

  if (/^\d{6}$/.test(trimmed) || /^(sh|sz|bj)\d{6}$/i.test(trimmed)) {
    return normalizeAHistorySymbol(trimmed)
  }

  if (/^\d{5}$/.test(trimmed)) {
    return normalizeHKHistorySymbol(trimmed)
  }

  if (/^(105|106|107)\./i.test(trimmed)) {
    return normalizeUSHistorySymbol(trimmed)
  }

  throw new Error(`Cannot auto-detect market for symbol: ${symbol}. Use A-share formats like sz000001, HK 5-digit formats like 00700, US formats like 105.AAPL, or pass --market.`)
}

export function normalizeKlineSymbolByMarket(symbol: string, market: KlineMarket): string {
  if (market === 'a') {
    return normalizeAHistorySymbol(symbol)
  }

  if (market === 'hk') {
    return normalizeHKHistorySymbol(symbol)
  }

  return normalizeUSHistorySymbol(symbol)
}