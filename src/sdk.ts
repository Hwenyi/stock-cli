import { StockSDK } from 'stock-sdk'
import packageJson from '../package.json' with { type: 'json' }

import type { RequestClientOptions } from 'stock-sdk'

import type { GlobalOptions } from './types'

export function createSdk(options: Pick<GlobalOptions, 'timeout' | 'rps'>): StockSDK {
  const clientOptions: RequestClientOptions = {
    timeout: options.timeout,
    userAgent: `stock-cli/${packageJson.version}`,
    rateLimit: {
      requestsPerSecond: options.rps,
      maxBurst: options.rps,
    },
    retry: {
      maxRetries: 2,
      baseDelay: 300,
      maxDelay: 1500,
    },
  }

  return new StockSDK(clientOptions)
}