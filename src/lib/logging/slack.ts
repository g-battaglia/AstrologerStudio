/**
 * Slack Webhook Integration for Log Notifications
 *
 * Sends formatted messages to a Slack channel via Incoming Webhooks.
 * Features:
 * - Rich message formatting with Block Kit
 * - Color-coded by log level (yellow for warn, red for error)
 * - Rate limiting to prevent spam
 * - Automatic retry with exponential backoff
 */

import type { LogLevel } from './server'

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const NEW_USER_WEBHOOK_URL = process.env.SLACK_NEW_USER_WEBHOOK_URL
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// Rate limiting: max 10 messages per minute
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_MESSAGES = 10
const messageTimestamps: number[] = []

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: Array<{ type: string; text: string }>
}

interface SlackMessage {
  blocks: SlackBlock[]
  attachments?: Array<{ color: string }>
}

/**
 * Check if we're within rate limits
 */
function isRateLimited(): boolean {
  const now = Date.now()
  // Remove timestamps older than the window
  while (messageTimestamps.length > 0 && messageTimestamps[0]! < now - RATE_LIMIT_WINDOW_MS) {
    messageTimestamps.shift()
  }
  return messageTimestamps.length >= RATE_LIMIT_MAX_MESSAGES
}

/**
 * Record a message timestamp for rate limiting
 */
function recordMessage(): void {
  messageTimestamps.push(Date.now())
}

/**
 * Get the color for a log level
 */
function getLevelColor(level: LogLevel): string {
  switch (level) {
    case 'error':
      return '#ff0000' // Red
    case 'warn':
      return '#ffcc00' // Yellow/Orange
    case 'info':
      return '#2196f3' // Blue
    case 'debug':
      return '#9e9e9e' // Gray
    default:
      return '#36a64f' // Green
  }
}

/**
 * Get emoji for a log level
 */
function getLevelEmoji(level: LogLevel): string {
  switch (level) {
    case 'error':
      return '🚨'
    case 'warn':
      return '⚠️'
    case 'info':
      return 'ℹ️'
    case 'debug':
      return '🔍'
    default:
      return '📝'
  }
}

/**
 * Format a log message for Slack using Block Kit
 */
function formatSlackMessage(level: LogLevel, message: string, args: unknown[]): SlackMessage {
  const emoji = getLevelEmoji(level)
  const env = process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
  const timestamp = new Date().toISOString()

  // Format args as string if present
  let fullMessage = message
  if (args.length > 0) {
    try {
      const argsStr = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      fullMessage = `${message}\n${argsStr}`
    } catch {
      // If serialization fails, just use the message
    }
  }

  // Truncate message if too long (Slack has a 3000 char limit for text blocks)
  if (fullMessage.length > 2500) {
    fullMessage = fullMessage.substring(0, 2500) + '... (truncated)'
  }

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${level.toUpperCase()} in ${env}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Level:*\n${level}`,
          },
          {
            type: 'mrkdwn',
            text: `*Timestamp:*\n${timestamp}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```' + fullMessage + '```',
        },
      },
    ],
    attachments: [
      {
        color: getLevelColor(level),
      },
    ],
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Send a notification to Slack
 *
 * @param level - The log level (warn, error)
 * @param message - The log message
 * @param args - Additional arguments that were logged
 * @returns Promise that resolves when the message is sent (or fails silently)
 */
export async function sendSlackNotification(
  level: LogLevel,
  message: string,
  args: unknown[] = []
): Promise<void> {
  // Skip if no webhook configured
  if (!WEBHOOK_URL) {
    return
  }

  // Check rate limiting
  if (isRateLimited()) {
    // Silently skip - we don't want to log about not being able to log
    return
  }

  const payload = formatSlackMessage(level, message, args)

  // Retry with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        recordMessage()
        return
      }

      // If not ok, wait and retry (unless it's a client error)
      if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        return
      }
    } catch {
      // Network error - will retry
    }

    // Wait before retrying (exponential backoff)
    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
    }
  }

  // All retries failed - silently give up
  // We don't log here to avoid infinite loops
}

/**
 * Send a notification to Slack when a new user registers
 *
 * @param username - The new user's username
 * @param email - The new user's email
 * @param authMethod - How the user registered ('email' or 'google')
 */
export async function sendNewUserNotification(
  username: string,
  email: string,
  authMethod: 'email' | 'google'
): Promise<void> {
  // Skip if no dedicated webhook configured
  if (!NEW_USER_WEBHOOK_URL) {
    return
  }

  // Check rate limiting
  if (isRateLimited()) {
    return
  }

  // Mask email for privacy (show first 2 chars and domain)
  const [localPart, domain] = email.split('@')
  const maskedEmail = localPart && domain 
    ? `${localPart.slice(0, 2)}***@${domain}` 
    : '***@***'

  const timestamp = new Date().toISOString()
  const authEmoji = authMethod === 'google' ? '🔵' : '📧'

  const payload: SlackMessage = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🎉 Nuovo utente registrato!',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Username:*\n${username}`,
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n${maskedEmail}`,
          },
          {
            type: 'mrkdwn',
            text: `*Metodo:*\n${authEmoji} ${authMethod === 'google' ? 'Google OAuth' : 'Email'}`,
          },
          {
            type: 'mrkdwn',
            text: `*Data:*\n${timestamp}`,
          },
        ],
      },
    ],
    attachments: [
      {
        color: '#36a64f', // Green
      },
    ],
  }

  // Retry with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(NEW_USER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        recordMessage()
        return
      }

      if (response.status >= 400 && response.status < 500) {
        return
      }
    } catch {
      // Network error - will retry
    }

    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
    }
  }
}
