#!/usr/bin/env bun

import { HttpError } from 'stock-sdk'

import { runAShareCommand } from './commands/a'
import { runFundCommand } from './commands/fund'
import { runHKCommand } from './commands/hk'
import { runKlineIndicatorsCommand } from './commands/kline-indicators'
import { runKlineCommand } from './commands/kline'
import { runSearchCommand } from './commands/search'
import { runUSCommand } from './commands/us'
import { createSdk } from './sdk'

import type { ATROptions, BIASOptions, BOLLOptions, CCIOptions, KDJOptions, MACDOptions, MAOptions, RSIOptions, WROptions } from 'stock-sdk'

import type {
  ATRIndicatorOption,
  BIASIndicatorOption,
  BOLLIndicatorOption,
  CCIIndicatorOption,
  CommandName,
  GlobalOptions,
  HelpTopic,
  KDJIndicatorOption,
  KlineAdjust,
  KlineCommandOptions,
  KlineIndicatorsCommandOptions,
  KlinePeriod,
  KlineMarket,
  MACDIndicatorOption,
  MAIndicatorOption,
  MAType,
  ParsedArgs,
  RSIIndicatorOption,
  WRIndicatorOption,
} from './types'

const DEFAULT_OPTIONS: GlobalOptions = {
  timeout: 10000,
  rps: 4,
  debug: false,
}

function isCommandName(value: string): value is CommandName {
  return value === 'a' || value === 'fund' || value === 'hk' || value === 'us' || value === 'search' || value === 'kline' || value === 'kline-indicators'
}

function getGeneralHelp(): string {
  return `stock-cli

Usage:
  stock-cli <command> [arguments] [options]
  stock-cli help [command]

Commands:
  a       Get A-share quotes
  fund    Get fund quotes
  hk      Get Hong Kong quotes
  us      Get US quotes
  search  Search stocks by code, name or pinyin
  kline   Get historical kline data for A-share, HK or US markets
  kline-indicators  Get kline data with indicators in one request

Global Options:
  --timeout <ms>  Request timeout in milliseconds, default 10000
  --rps <n>       Requests per second limit, default 4
  --debug         Print full error stack
  -h, --help      Show help

Kline-only Options:
  --period <value>  daily, weekly, monthly
  --adjust <value>  qfq, hfq, none
  --start <date>    Start date in YYYYMMDD
  --end <date>      End date in YYYYMMDD

Kline-indicators Options:
  --market <value>      a, hk, us
  --ma                  Enable MA with SDK defaults
  --ma-periods <list>   Comma-separated periods, e.g. 5,10,20,60
  --ma-type <value>     sma, ema, wma
  --macd                Enable MACD with SDK defaults
  --macd-short <n>      MACD short EMA period
  --macd-long <n>       MACD long EMA period
  --macd-signal <n>     MACD signal EMA period
  --boll                Enable BOLL with SDK defaults
  --boll-period <n>     BOLL period
  --boll-stddev <n>     BOLL standard deviation multiplier
  --kdj                 Enable KDJ with SDK defaults
  --kdj-period <n>      KDJ RSV period
  --kdj-k <n>           K smoothing period
  --kdj-d <n>           D smoothing period
  --rsi                 Enable RSI with SDK defaults
  --rsi-periods <list>  RSI period list
  --wr                  Enable WR with SDK defaults
  --wr-periods <list>   WR period list
  --bias                Enable BIAS with SDK defaults
  --bias-periods <list> BIAS period list
  --cci                 Enable CCI with SDK defaults
  --cci-period <n>      CCI period
  --atr                 Enable ATR with SDK defaults
  --atr-period <n>      ATR period

Examples:
  stock-cli a sh600519 sz000858
  stock-cli fund 000001 110011
  stock-cli hk 700 09988
  stock-cli us AAPL TSLA
  stock-cli search maotai
  stock-cli kline a sh600519 --period weekly --start 20240101 --end 20241231
  stock-cli kline-indicators sz000001 --start 20240101 --end 20241231 --ma --macd
  stock-cli help kline

Notes:
  Output is always JSON.
  Run stock-cli help <command> for detailed command usage.
`
}

function getCommandHelp(topic: CommandName): string {
  switch (topic) {
    case 'a':
      return `stock-cli a

Purpose:
  Get A-share or index quote snapshots through stock-sdk.getSimpleQuotes.

Usage:
  stock-cli a <codes...> [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <codes...>  One or more A-share or index codes.

Code Format:
  Must include exchange prefix.
  Examples: sh600519, sz000858, bj430047, sh000001

Examples:
  stock-cli a sh600519
  stock-cli a sh000001 sz399001

Output:
  JSON array of SimpleQuote objects.
`
    case 'fund':
      return `stock-cli fund

Purpose:
  Get fund NAV quotes through stock-sdk.getFundQuotes.

Usage:
  stock-cli fund <codes...> [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <codes...>  One or more public fund codes.

Code Format:
  Must be exactly 6 digits.
  Examples: 000001, 110011, 161005

Examples:
  stock-cli fund 000001
  stock-cli fund 000001 110011

Output:
  JSON array of FundQuote objects.

Notes:
  Exchange-traded ETFs are better queried with the a command.
`
    case 'hk':
      return `stock-cli hk

Purpose:
  Get Hong Kong stock quotes through stock-sdk.getHKQuotes.

Usage:
  stock-cli hk <codes...> [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <codes...>  One or more Hong Kong stock codes.

Code Format:
  Accepts 1 to 5 digits and auto-pads to 5 digits.
  Examples: 700 -> 00700, 9988 -> 09988, 00005

Examples:
  stock-cli hk 700
  stock-cli hk 00700 09988

Output:
  JSON array of HKQuote objects.
`
    case 'us':
      return `stock-cli us

Purpose:
  Get US stock quotes through stock-sdk.getUSQuotes.

Usage:
  stock-cli us <codes...> [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <codes...>  One or more US tickers.

Code Format:
  Accepts ticker symbols and auto-normalizes them to uppercase.
  Examples: AAPL, MSFT, BRK.B, baba -> BABA

Examples:
  stock-cli us AAPL
  stock-cli us AAPL MSFT TSLA

Output:
  JSON array of USQuote objects.

Notes:
  The quote API may return market-suffixed codes such as AAPL.OQ in the JSON response.
`
    case 'search':
      return `stock-cli search

Purpose:
  Search stocks by code, company name or pinyin through stock-sdk.search.

Usage:
  stock-cli search <keyword...> [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <keyword...>  One or more words that will be joined into a single search keyword.

Keyword Examples:
  maotai
  腾讯
  00700
  贵州 茅台

Examples:
  stock-cli search maotai
  stock-cli search 腾讯
  stock-cli search 贵州 茅台

Output:
  JSON array of SearchResult objects.
`
    case 'kline':
      return `stock-cli kline

Purpose:
  Get historical kline data through stock-sdk.getHistoryKline, getHKHistoryKline or getUSHistoryKline.

Usage:
  stock-cli kline <market> <symbol> [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <market>  One of: a, hk, us
  <symbol>  Symbol format depends on market

Symbol Format:
  a   : 000001 or sz000001 or sh600519 or bj430047
  hk  : 700 or 00700 or 09988
  us  : 105.AAPL, 105.MSFT, 106.BABA, 107.XXX

Options:
  --period  daily, weekly, monthly. Default follows SDK behavior.
  --adjust  qfq, hfq, none. 'none' maps to the SDK empty-string no-adjust mode.
  --start   Start date in YYYYMMDD.
  --end     End date in YYYYMMDD.

Examples:
  stock-cli kline a sh600519 --period weekly --adjust qfq --start 20240101 --end 20241231
  stock-cli kline hk 700 --period monthly --adjust none
  stock-cli kline us 105.AAPL --period monthly

Output:
  JSON array of HistoryKline or HKUSHistoryKline objects.

Notes:
  Kline command expects exactly 2 operands: <market> <symbol>.
`
    case 'kline-indicators':
      return `stock-cli kline-indicators

Purpose:
  Get historical kline data with indicators in one request through stock-sdk.getKlineWithIndicators.

Usage:
  stock-cli kline-indicators <symbol> [--market <a|hk|us>] [--period <daily|weekly|monthly>] [--adjust <qfq|hfq|none>] [--start <YYYYMMDD>] [--end <YYYYMMDD>] [--ma] [--ma-periods <p1,p2,...>] [--ma-type <sma|ema|wma>] [--macd] [--macd-short <n>] [--macd-long <n>] [--macd-signal <n>] [--boll] [--boll-period <n>] [--boll-stddev <n>] [--kdj] [--kdj-period <n>] [--kdj-k <n>] [--kdj-d <n>] [--rsi] [--rsi-periods <p1,p2,...>] [--wr] [--wr-periods <p1,p2,...>] [--bias] [--bias-periods <p1,p2,...>] [--cci] [--cci-period <n>] [--atr] [--atr-period <n>] [--timeout <ms>] [--rps <n>] [--debug]

Required Arguments:
  <symbol>  Symbol for A-share, HK or US markets.

Symbol Format:
  auto-detect : sz000001, sh600519, 000001, 00700, 09988, 105.AAPL
  --market hk: 700 or 00700 or 09988
  --market us: 105.AAPL, 106.BABA, 107.XXX

Indicator Switches:
  --ma --macd --boll --kdj --rsi --wr --bias --cci --atr

Examples:
  stock-cli kline-indicators sz000001 --start 20240101 --end 20241231 --ma --macd
  stock-cli kline-indicators sh600519 --period weekly --ma --ma-periods 5,10,20,60 --ma-type ema --rsi --rsi-periods 6,12
  stock-cli kline-indicators 00700 --boll --boll-period 20 --boll-stddev 2 --kdj
  stock-cli kline-indicators 105.MSFT --market us --macd --macd-short 12 --macd-long 26 --macd-signal 9 --atr --atr-period 14

Output:
  JSON array of KlineWithIndicators objects.

Notes:
  At least one indicator switch or indicator parameter is required.
  This command is intentionally distinct from future standalone indicator commands such as MA-only or MACD-only queries.
`
  }
}

function printHelp(topic: HelpTopic, error?: string): void {
  if (error) {
    console.error(`Error: ${error}\n`)
  }

  console.log(topic === 'general' ? getGeneralHelp() : getCommandHelp(topic))
}

function parseKlinePeriod(rawValue: string | undefined): KlinePeriod {
  if (!rawValue) {
    throw new Error('Missing value for --period.')
  }

  if (rawValue === 'daily' || rawValue === 'weekly' || rawValue === 'monthly') {
    return rawValue
  }

  throw new Error(`Invalid value for --period: ${rawValue}.`)
}

function parseKlineAdjust(rawValue: string | undefined): KlineAdjust {
  if (!rawValue) {
    throw new Error('Missing value for --adjust.')
  }

  if (rawValue === 'none') {
    return ''
  }

  if (rawValue === 'qfq' || rawValue === 'hfq') {
    return rawValue
  }

  throw new Error(`Invalid value for --adjust: ${rawValue}.`)
}

function parseDateOption(rawValue: string | undefined, label: string): string {
  if (!rawValue) {
    throw new Error(`Missing value for ${label}.`)
  }

  if (!/^\d{8}$/.test(rawValue)) {
    throw new Error(`Invalid value for ${label}: ${rawValue}. Expected YYYYMMDD.`)
  }

  return rawValue
}

function readOptionValue(args: string[], index: number, name: string): [string | undefined, number] {
  const current = args[index]
  const [, inlineValue] = current.split('=')
  if (inlineValue !== undefined) {
    return [inlineValue, index]
  }

  return [args[index + 1], index + 1]
}

function parseNumberOption(rawValue: string | undefined, label: string): number {
  if (!rawValue) {
    throw new Error(`Missing value for ${label}.`)
  }

  const value = Number(rawValue)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid value for ${label}: ${rawValue}.`)
  }

  return value
}

function parseIntegerOption(rawValue: string | undefined, label: string): number {
  const value = parseNumberOption(rawValue, label)

  if (!Number.isInteger(value)) {
    throw new Error(`Invalid value for ${label}: ${rawValue}. Expected an integer.`)
  }

  return value
}

function parseNumberListOption(rawValue: string | undefined, label: string): number[] {
  if (!rawValue) {
    throw new Error(`Missing value for ${label}.`)
  }

  const values = rawValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => parseIntegerOption(part, label))

  if (values.length === 0) {
    throw new Error(`Invalid value for ${label}: ${rawValue}. Expected a comma-separated integer list.`)
  }

  return values
}

function parseMAType(rawValue: string | undefined): MAType {
  if (!rawValue) {
    throw new Error('Missing value for --ma-type.')
  }

  if (rawValue === 'sma' || rawValue === 'ema' || rawValue === 'wma') {
    return rawValue
  }

  throw new Error(`Invalid value for --ma-type: ${rawValue}.`)
}

function parseIndicatorMarket(rawValue: string | undefined): KlineMarket {
  if (!rawValue) {
    throw new Error('Missing value for --market.')
  }

  if (rawValue === 'a' || rawValue === 'hk' || rawValue === 'us') {
    return rawValue
  }

  throw new Error(`Invalid value for --market: ${rawValue}. Expected one of a, hk, us.`)
}

function ensureObjectOption<T extends object>(current: T | boolean | undefined): T {
  if (current && typeof current === 'object') {
    return current
  }

  return {} as T
}

function enableIndicator<T extends object>(current: T | boolean | undefined): T | boolean {
  if (current && typeof current === 'object') {
    return current
  }

  return true
}

function hasKlineBaseOptions(options: KlineCommandOptions): boolean {
  return options.period !== undefined || options.adjust !== undefined || options.startDate !== undefined || options.endDate !== undefined
}

function hasKlineIndicatorSpecificOptions(options: KlineIndicatorsCommandOptions): boolean {
  return options.market !== undefined || Object.keys(options.indicators).length > 0
}

function parseArgs(args: string[]): ParsedArgs {
  const options: GlobalOptions = { ...DEFAULT_OPTIONS }
  const klineOptions: KlineCommandOptions = {}
  const klineIndicatorsOptions: KlineIndicatorsCommandOptions = { indicators: {} }
  let command: CommandName | null = null
  const operands: string[] = []

  if (args[0] === 'help') {
    if (args.length === 1) {
      return { command: null, operands: [], options, klineOptions, klineIndicatorsOptions, help: true, helpTopic: 'general' }
    }

    if (args.length === 2 && isCommandName(args[1])) {
      return { command: args[1], operands: [], options, klineOptions, klineIndicatorsOptions, help: true, helpTopic: args[1] }
    }

    return {
      command: null,
      operands: args.slice(1),
      options,
      klineOptions,
      klineIndicatorsOptions,
      help: false,
      helpTopic: 'general',
      error: `Unknown help topic: ${args.slice(1).join(' ')}.`,
    }
  }

  try {
    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index]

      if (arg === '-h' || arg === '--help') {
        return { command, operands, options, klineOptions, klineIndicatorsOptions, help: true, helpTopic: command ?? 'general' }
      }

      if (arg === '--debug') {
        options.debug = true
        continue
      }

      if (arg === '--period' || arg.startsWith('--period=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--period')
        klineOptions.period = parseKlinePeriod(value)
        klineIndicatorsOptions.period = klineOptions.period
        index = nextIndex
        continue
      }

      if (arg === '--adjust' || arg.startsWith('--adjust=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--adjust')
        klineOptions.adjust = parseKlineAdjust(value)
        klineIndicatorsOptions.adjust = klineOptions.adjust
        index = nextIndex
        continue
      }

      if (arg === '--start' || arg.startsWith('--start=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--start')
        klineOptions.startDate = parseDateOption(value, '--start')
        klineIndicatorsOptions.startDate = klineOptions.startDate
        index = nextIndex
        continue
      }

      if (arg === '--end' || arg.startsWith('--end=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--end')
        klineOptions.endDate = parseDateOption(value, '--end')
        klineIndicatorsOptions.endDate = klineOptions.endDate
        index = nextIndex
        continue
      }

      if (arg === '--market' || arg.startsWith('--market=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--market')
        klineIndicatorsOptions.market = parseIndicatorMarket(value)
        index = nextIndex
        continue
      }

      if (arg === '--ma') {
        klineIndicatorsOptions.indicators.ma = enableIndicator<MAOptions>(klineIndicatorsOptions.indicators.ma as MAIndicatorOption)
        continue
      }

      if (arg === '--ma-periods' || arg.startsWith('--ma-periods=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--ma-periods')
        const maOptions = ensureObjectOption<MAOptions>(klineIndicatorsOptions.indicators.ma as MAIndicatorOption)
        maOptions.periods = parseNumberListOption(value, '--ma-periods')
        klineIndicatorsOptions.indicators.ma = maOptions
        index = nextIndex
        continue
      }

      if (arg === '--ma-type' || arg.startsWith('--ma-type=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--ma-type')
        const maOptions = ensureObjectOption<MAOptions>(klineIndicatorsOptions.indicators.ma as MAIndicatorOption)
        maOptions.type = parseMAType(value)
        klineIndicatorsOptions.indicators.ma = maOptions
        index = nextIndex
        continue
      }

      if (arg === '--macd') {
        klineIndicatorsOptions.indicators.macd = enableIndicator<MACDOptions>(klineIndicatorsOptions.indicators.macd as MACDIndicatorOption)
        continue
      }

      if (arg === '--macd-short' || arg.startsWith('--macd-short=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--macd-short')
        const macdOptions = ensureObjectOption<MACDOptions>(klineIndicatorsOptions.indicators.macd as MACDIndicatorOption)
        macdOptions.short = parseIntegerOption(value, '--macd-short')
        klineIndicatorsOptions.indicators.macd = macdOptions
        index = nextIndex
        continue
      }

      if (arg === '--macd-long' || arg.startsWith('--macd-long=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--macd-long')
        const macdOptions = ensureObjectOption<MACDOptions>(klineIndicatorsOptions.indicators.macd as MACDIndicatorOption)
        macdOptions.long = parseIntegerOption(value, '--macd-long')
        klineIndicatorsOptions.indicators.macd = macdOptions
        index = nextIndex
        continue
      }

      if (arg === '--macd-signal' || arg.startsWith('--macd-signal=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--macd-signal')
        const macdOptions = ensureObjectOption<MACDOptions>(klineIndicatorsOptions.indicators.macd as MACDIndicatorOption)
        macdOptions.signal = parseIntegerOption(value, '--macd-signal')
        klineIndicatorsOptions.indicators.macd = macdOptions
        index = nextIndex
        continue
      }

      if (arg === '--boll') {
        klineIndicatorsOptions.indicators.boll = enableIndicator<BOLLOptions>(klineIndicatorsOptions.indicators.boll as BOLLIndicatorOption)
        continue
      }

      if (arg === '--boll-period' || arg.startsWith('--boll-period=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--boll-period')
        const bollOptions = ensureObjectOption<BOLLOptions>(klineIndicatorsOptions.indicators.boll as BOLLIndicatorOption)
        bollOptions.period = parseIntegerOption(value, '--boll-period')
        klineIndicatorsOptions.indicators.boll = bollOptions
        index = nextIndex
        continue
      }

      if (arg === '--boll-stddev' || arg.startsWith('--boll-stddev=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--boll-stddev')
        const bollOptions = ensureObjectOption<BOLLOptions>(klineIndicatorsOptions.indicators.boll as BOLLIndicatorOption)
        bollOptions.stdDev = parseNumberOption(value, '--boll-stddev')
        klineIndicatorsOptions.indicators.boll = bollOptions
        index = nextIndex
        continue
      }

      if (arg === '--kdj') {
        klineIndicatorsOptions.indicators.kdj = enableIndicator<KDJOptions>(klineIndicatorsOptions.indicators.kdj as KDJIndicatorOption)
        continue
      }

      if (arg === '--kdj-period' || arg.startsWith('--kdj-period=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--kdj-period')
        const kdjOptions = ensureObjectOption<KDJOptions>(klineIndicatorsOptions.indicators.kdj as KDJIndicatorOption)
        kdjOptions.period = parseIntegerOption(value, '--kdj-period')
        klineIndicatorsOptions.indicators.kdj = kdjOptions
        index = nextIndex
        continue
      }

      if (arg === '--kdj-k' || arg.startsWith('--kdj-k=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--kdj-k')
        const kdjOptions = ensureObjectOption<KDJOptions>(klineIndicatorsOptions.indicators.kdj as KDJIndicatorOption)
        kdjOptions.kPeriod = parseIntegerOption(value, '--kdj-k')
        klineIndicatorsOptions.indicators.kdj = kdjOptions
        index = nextIndex
        continue
      }

      if (arg === '--kdj-d' || arg.startsWith('--kdj-d=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--kdj-d')
        const kdjOptions = ensureObjectOption<KDJOptions>(klineIndicatorsOptions.indicators.kdj as KDJIndicatorOption)
        kdjOptions.dPeriod = parseIntegerOption(value, '--kdj-d')
        klineIndicatorsOptions.indicators.kdj = kdjOptions
        index = nextIndex
        continue
      }

      if (arg === '--rsi') {
        klineIndicatorsOptions.indicators.rsi = enableIndicator<RSIOptions>(klineIndicatorsOptions.indicators.rsi as RSIIndicatorOption)
        continue
      }

      if (arg === '--rsi-periods' || arg.startsWith('--rsi-periods=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--rsi-periods')
        const rsiOptions = ensureObjectOption<RSIOptions>(klineIndicatorsOptions.indicators.rsi as RSIIndicatorOption)
        rsiOptions.periods = parseNumberListOption(value, '--rsi-periods')
        klineIndicatorsOptions.indicators.rsi = rsiOptions
        index = nextIndex
        continue
      }

      if (arg === '--wr') {
        klineIndicatorsOptions.indicators.wr = enableIndicator<WROptions>(klineIndicatorsOptions.indicators.wr as WRIndicatorOption)
        continue
      }

      if (arg === '--wr-periods' || arg.startsWith('--wr-periods=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--wr-periods')
        const wrOptions = ensureObjectOption<WROptions>(klineIndicatorsOptions.indicators.wr as WRIndicatorOption)
        wrOptions.periods = parseNumberListOption(value, '--wr-periods')
        klineIndicatorsOptions.indicators.wr = wrOptions
        index = nextIndex
        continue
      }

      if (arg === '--bias') {
        klineIndicatorsOptions.indicators.bias = enableIndicator<BIASOptions>(klineIndicatorsOptions.indicators.bias as BIASIndicatorOption)
        continue
      }

      if (arg === '--bias-periods' || arg.startsWith('--bias-periods=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--bias-periods')
        const biasOptions = ensureObjectOption<BIASOptions>(klineIndicatorsOptions.indicators.bias as BIASIndicatorOption)
        biasOptions.periods = parseNumberListOption(value, '--bias-periods')
        klineIndicatorsOptions.indicators.bias = biasOptions
        index = nextIndex
        continue
      }

      if (arg === '--cci') {
        klineIndicatorsOptions.indicators.cci = enableIndicator<CCIOptions>(klineIndicatorsOptions.indicators.cci as CCIIndicatorOption)
        continue
      }

      if (arg === '--cci-period' || arg.startsWith('--cci-period=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--cci-period')
        const cciOptions = ensureObjectOption<CCIOptions>(klineIndicatorsOptions.indicators.cci as CCIIndicatorOption)
        cciOptions.period = parseIntegerOption(value, '--cci-period')
        klineIndicatorsOptions.indicators.cci = cciOptions
        index = nextIndex
        continue
      }

      if (arg === '--atr') {
        klineIndicatorsOptions.indicators.atr = enableIndicator<ATROptions>(klineIndicatorsOptions.indicators.atr as ATRIndicatorOption)
        continue
      }

      if (arg === '--atr-period' || arg.startsWith('--atr-period=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--atr-period')
        const atrOptions = ensureObjectOption<ATROptions>(klineIndicatorsOptions.indicators.atr as ATRIndicatorOption)
        atrOptions.period = parseIntegerOption(value, '--atr-period')
        klineIndicatorsOptions.indicators.atr = atrOptions
        index = nextIndex
        continue
      }

      if (arg === '--timeout' || arg.startsWith('--timeout=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--timeout')
        options.timeout = parseNumberOption(value, '--timeout')
        index = nextIndex
        continue
      }

      if (arg === '--rps' || arg.startsWith('--rps=')) {
        const [value, nextIndex] = readOptionValue(args, index, '--rps')
        options.rps = parseNumberOption(value, '--rps')
        index = nextIndex
        continue
      }

      if (arg.startsWith('-')) {
        return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: 'general', error: `Unknown option: ${arg}` }
      }

      if (!command) {
        if (arg === 'a' || arg === 'fund' || arg === 'hk' || arg === 'us' || arg === 'search' || arg === 'kline' || arg === 'kline-indicators') {
          command = arg
          continue
        }

        return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: 'general', error: `Unknown command: ${arg}` }
      }

      operands.push(arg)
    }
  } catch (error) {
    return {
      command,
      operands,
      options,
      klineOptions,
      klineIndicatorsOptions,
      help: false,
      helpTopic: 'general',
      error: error instanceof Error ? error.message : 'Failed to parse arguments.',
    }
  }

  if (!command) {
    return { command, operands, options, klineOptions, klineIndicatorsOptions, help: true, helpTopic: 'general' }
  }

  if (operands.length === 0) {
    const missingLabel = command === 'search' ? 'keyword' : command === 'kline' ? 'market and symbol' : command === 'kline-indicators' ? 'symbol' : 'codes'
    return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: command, error: `Missing ${missingLabel} for ${command}.` }
  }

  if (command === 'kline' && operands.length !== 2) {
    return {
      command,
      operands,
      options,
      klineOptions,
      klineIndicatorsOptions,
      help: false,
      helpTopic: command,
      error: 'Kline command expects exactly 2 operands: <market> <symbol>.',
    }
  }

  if (command === 'kline-indicators' && operands.length !== 1) {
    return {
      command,
      operands,
      options,
      klineOptions,
      klineIndicatorsOptions,
      help: false,
      helpTopic: command,
      error: 'Kline-indicators command expects exactly 1 operand: <symbol>.',
    }
  }

  if (command !== 'kline' && command !== 'kline-indicators' && hasKlineBaseOptions(klineOptions)) {
    return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: command, error: 'Kline options are only supported by the kline and kline-indicators commands.' }
  }

  if (command !== 'kline-indicators' && hasKlineIndicatorSpecificOptions(klineIndicatorsOptions)) {
    return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: command, error: 'Indicator options are only supported by the kline-indicators command.' }
  }

  if (command === 'kline-indicators' && Object.keys(klineIndicatorsOptions.indicators).length === 0) {
    return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: command, error: 'Kline-indicators command requires at least one indicator option such as --ma or --macd.' }
  }

  return { command, operands, options, klineOptions, klineIndicatorsOptions, help: false, helpTopic: command }
}

function printError(error: unknown, debug: boolean): void {
  if (error instanceof HttpError) {
    console.error(`Request failed: ${error.status} ${error.statusText}`)
    if (error.provider) {
      console.error(`Provider: ${error.provider}`)
    }
    if (error.url && debug) {
      console.error(`URL: ${error.url}`)
    }
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`)
  } else {
    console.error('Error: Unknown failure.')
  }

  if (debug && error instanceof Error && error.stack) {
    console.error(error.stack)
  }
}

async function runCommand(parsed: ParsedArgs): Promise<void> {
  const sdk = createSdk(parsed.options)
  const context = { options: parsed.options }

  if (parsed.command === 'a') {
    await runAShareCommand(sdk, parsed.operands, context)
    return
  }

  if (parsed.command === 'fund') {
    await runFundCommand(sdk, parsed.operands, context)
    return
  }

  if (parsed.command === 'hk') {
    await runHKCommand(sdk, parsed.operands, context)
    return
  }

  if (parsed.command === 'us') {
    await runUSCommand(sdk, parsed.operands, context)
    return
  }

  if (parsed.command === 'search') {
    await runSearchCommand(sdk, parsed.operands, context)
    return
  }

  if (parsed.command === 'kline') {
    await runKlineCommand(sdk, parsed.operands, parsed.klineOptions, context)
    return
  }

  if (parsed.command === 'kline-indicators') {
    await runKlineIndicatorsCommand(sdk, parsed.operands, parsed.klineIndicatorsOptions, context)
  }
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2))

  if (parsed.help || parsed.error) {
    printHelp(parsed.helpTopic, parsed.error)
    process.exit(parsed.error ? 1 : 0)
  }

  try {
    await runCommand(parsed)
  } catch (error) {
    printError(error, parsed.options.debug)
    process.exit(error instanceof HttpError ? 2 : 1)
  }
}

await main()