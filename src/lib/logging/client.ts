/**
 * Client-side logger for browser environments
 * Similar to server logger but works in browser context
 *
 * Uses NEXT_PUBLIC_LOG_LEVEL for configuration
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

function getLogLevel(): LogLevel {
  if (typeof window === 'undefined') {
    return 'info'
  }

  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel
  }

  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

const currentLevel = getLogLevel()

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

/**
 * Client-side logger
 *
 * @example
 * ```ts
 * import { clientLogger } from '@/lib/logging/client'
 * clientLogger.debug('Cache hit', { key })
 * ```
 */
export const clientLogger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.warn(`[DEBUG] ${message}`, ...args)
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.warn(`[INFO] ${message}`, ...args)
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },

  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  },

  getLevel: (): LogLevel => currentLevel,
}

export default clientLogger
