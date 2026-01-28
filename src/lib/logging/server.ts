/**
 * Simple logger utility with configurable log level via environment variables.
 *
 * Log levels (in order of verbosity):
 * - debug: All logs including detailed debugging information
 * - info: Informational messages and above
 * -  warn: Warnings and errors only
 * - error: Errors only
 * - silent: No logging
 *
 * Set LOG_LEVEL (server-side) in production or NEXT_PUBLIC_LOG_LEVEL in development.
 * Default: 'warn' in production, 'debug' in development
 */

import { redactSensitive } from './redaction'
import { inspect } from 'node:util'
import { notify } from './notifier'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

function getLogLevel(): LogLevel {
  // In production, only use server-side env var to prevent accidental debug exposure
  if (process.env.NODE_ENV === 'production') {
    const serverLevel = process.env.LOG_LEVEL as LogLevel | undefined
    if (serverLevel && LOG_LEVELS[serverLevel] !== undefined) {
      return serverLevel
    }
    // Default to 'warn' in production for security
    return 'warn'
  }

  // In development, allow NEXT_PUBLIC_LOG_LEVEL
  const envLevel = process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel | undefined
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel
  }

  // Default based on environment
  return 'debug'
}

const currentLevel = getLogLevel()

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function writeStdout(prefix: string, message: string, args: unknown[]): void {
  const redactedArgs = args.map((arg) => redactSensitive(arg))
  const renderedArgs = redactedArgs.length ? ` ${inspect(redactedArgs, { depth: 6, breakLength: 120 })}` : ''
  if (typeof process !== 'undefined' && process.stdout && typeof process.stdout.write === 'function') {
    process.stdout.write(`${prefix} ${message}${renderedArgs}\n`)
  } else {
    // Fallback for non-Node environments (misconfigured client bundles)
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${message}${renderedArgs}`)
  }
}

/**
 * Logger with configurable level support and automatic sensitive data redaction
 */
export const logger = {
  /**
   * Debug level - detailed debugging information (redacted)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      const redactedArgs = args.map((arg) => redactSensitive(arg))
      writeStdout('[DEBUG]', message, redactedArgs)
      notify('debug', message, redactedArgs)
    }
  },

  /**
   * Info level - general informational messages (redacted)
   */
  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      const redactedArgs = args.map((arg) => redactSensitive(arg))
      writeStdout('[INFO]', message, redactedArgs)
      notify('info', message, redactedArgs)
    }
  },

  /**
   * Warn level - warning messages (redacted)
   */
  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      const redactedArgs = args.map((arg) => redactSensitive(arg))
      console.warn(`[WARN] ${message}`, ...redactedArgs)
      notify('warn', message, redactedArgs)
    }
  },

  /**
   * Error level - error messages (redacted)
   */
  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      const redactedArgs = args.map((arg) => redactSensitive(arg))
      console.error(`[ERROR] ${message}`, ...redactedArgs)
      notify('error', message, redactedArgs)
    }
  },

  /**
   * Get current log level
   */
  getLevel: (): LogLevel => currentLevel,
}

export default logger
