import type { ATROptions, BIASOptions, BOLLOptions, CCIOptions, IndicatorOptions, KDJOptions, MACDOptions, MAOptions, RSIOptions, WROptions } from 'stock-sdk'

export type OutputFormat = 'yaml' | 'json'

export interface GlobalOptions {
  timeout: number
  rps: number
  debug: boolean
  outputFormat: OutputFormat
}

export interface CommandContext {
  options: GlobalOptions
}

export type CommandName = 'a' | 'fund' | 'hk' | 'us' | 'search' | 'kline' | 'kline-indicators'
export type HelpTopic = 'general' | CommandName

export type KlineMarket = 'a' | 'hk' | 'us'
export type KlinePeriod = 'daily' | 'weekly' | 'monthly'
export type KlineAdjust = '' | 'qfq' | 'hfq'
export type MAType = 'sma' | 'ema' | 'wma'

export interface KlineCommandOptions {
  period?: KlinePeriod
  adjust?: KlineAdjust
  startDate?: string
  endDate?: string
}

export interface KlineIndicatorsCommandOptions extends KlineCommandOptions {
  market?: KlineMarket
  indicators: IndicatorOptions
}

export type MAIndicatorOption = MAOptions | boolean | undefined
export type MACDIndicatorOption = MACDOptions | boolean | undefined
export type BOLLIndicatorOption = BOLLOptions | boolean | undefined
export type KDJIndicatorOption = KDJOptions | boolean | undefined
export type RSIIndicatorOption = RSIOptions | boolean | undefined
export type WRIndicatorOption = WROptions | boolean | undefined
export type BIASIndicatorOption = BIASOptions | boolean | undefined
export type CCIIndicatorOption = CCIOptions | boolean | undefined
export type ATRIndicatorOption = ATROptions | boolean | undefined

export interface ParsedArgs {
  command: CommandName | null
  operands: string[]
  options: GlobalOptions
  klineOptions: KlineCommandOptions
  klineIndicatorsOptions: KlineIndicatorsCommandOptions
  help: boolean
  helpTopic: HelpTopic
  error?: string
}