'use client'

import { useQuery } from '@tanstack/react-query'
import { getChartPreferences } from '@/actions/preferences'
import { type DateFormat, type TimeFormat } from '@/lib/utils/date'

/**
 * Hook to access the user's date format preference
 *
 * @returns The date format preference (US, EU, or ISO) with EU as default
 *
 * @example
 * ```tsx
 * const dateFormat = useDateFormat()
 * const formatted = formatDisplayDate(date, dateFormat)
 * ```
 */
export function useDateFormat(): DateFormat {
  const { data: prefs } = useQuery({
    queryKey: ['chartPreferences'],
    queryFn: getChartPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return prefs?.date_format ?? 'EU'
}

/**
 * Hook to access the user's time format preference
 *
 * @returns The time format preference (12h or 24h) with 24h as default
 *
 * @example
 * ```tsx
 * const timeFormat = useTimeFormat()
 * const formatted = formatDisplayTime(date, timeFormat)
 * ```
 */
export function useTimeFormat(): TimeFormat {
  const { data: prefs } = useQuery({
    queryKey: ['chartPreferences'],
    queryFn: getChartPreferences,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  return prefs?.time_format ?? '24h'
}
