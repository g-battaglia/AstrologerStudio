/**
 * Notification Orchestrator for Log Events
 *
 * Manages when and how notifications are sent based on:
 * - Log level thresholds
 * - Environment configuration
 * - Feature flags
 */

import type { LogLevel } from './server'
import { sendSlackNotification } from './slack'

// Configuration from environment
const ENABLE_NOTIFICATIONS = process.env.ENABLE_SLACK_NOTIFICATIONS !== 'false'
const NOTIFY_LEVEL = (process.env.SLACK_NOTIFY_LEVEL as LogLevel) || 'error'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

/**
 * Check if a log level should trigger a notification
 */
function shouldNotify(level: LogLevel): boolean {
  // Notifications disabled
  if (!ENABLE_NOTIFICATIONS) {
    return false
  }

  // Only notify in production by default (unless explicitly enabled)
  if (!IS_PRODUCTION && process.env.ENABLE_SLACK_NOTIFICATIONS !== 'true') {
    return false
  }

  // Check if level meets threshold
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[NOTIFY_LEVEL]
}

/**
 * Send a notification for a log event
 *
 * This is a fire-and-forget operation - it won't block the caller
 * and errors are silently swallowed to prevent logging loops.
 *
 * @param level - The log level
 * @param message - The log message
 * @param args - Additional logged arguments
 */
export function notify(level: LogLevel, message: string, args: unknown[] = []): void {
  if (!shouldNotify(level)) {
    return
  }

  // Fire-and-forget: don't await, don't catch
  // The sendSlackNotification function handles its own errors
  void sendSlackNotification(level, message, args)
}

/**
 * Manually send a notification regardless of level settings
 * Useful for critical alerts that should always be sent
 *
 * @param message - The notification message
 * @param context - Additional context to include
 */
export function notifyImmediate(message: string, context?: Record<string, unknown>): void {
  if (!ENABLE_NOTIFICATIONS) {
    return
  }

  void sendSlackNotification('error', message, context ? [context] : [])
}
