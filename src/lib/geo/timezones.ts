// Return a list of IANA time zone identifiers. Prefer runtime support if available.
export function getAllTimezones(): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyIntl: any = Intl as any
  if (typeof anyIntl.supportedValuesOf === 'function') {
    try {
      const vals = anyIntl.supportedValuesOf('timeZone')
      if (Array.isArray(vals) && vals.length) return vals as string[]
    } catch {
      // ignore
    }
  }
  // Fallback minimal list (extend as needed)
  return [
    'UTC',
    'Europe/Rome',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Prague',
    'Europe/Vienna',
    'Europe/Zurich',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Sao_Paulo',
    'America/Toronto',
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland',
  ]
}
