/**
 * Sensitive Data Redaction Utility
 *
 * Automatically redacts sensitive fields from objects before logging
 * to prevent accidental exposure of credentials, tokens, and personal data.
 */

const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'authorization',
  'bearer',
  'credit_card',
  'creditcard',
  'cvv',
  'ssn',
  'session',
  'cookie',
]

/**
 * Check if a field name contains sensitive keywords
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase()
  return SENSITIVE_FIELDS.some((sensitive) => lowerField.includes(sensitive))
}

/**
 * Recursively redact sensitive fields from an object
 *
 * @param obj - Object to redact
 * @returns Redacted copy of the object
 */
export function redactSensitive(obj: unknown): unknown {
  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj
  }

  // Handle primitives
  if (typeof obj !== 'object') {
    return obj
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item))
  }

  // Handle objects
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      redacted[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value)
    } else {
      redacted[key] = value
    }
  }

  return redacted
}
