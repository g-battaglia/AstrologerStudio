'use client'

import { useEffect, useState, useRef } from 'react'
import { startOfMonth, endOfMonth, format, addMonths, isSameMonth, isBefore, startOfDay, endOfDay } from 'date-fns'
import { type TransitDayData } from '@/lib/api/transits'
import { getTransitRange } from '@/actions/transits'
import { getCachedTransitMonth, setCachedTransitMonth } from '@/lib/cache/transits'
import type { SubjectModel, ChartRequestOptions } from '@/types/astrology'
import { clientLogger } from '@/lib/logging/client'

interface UseTransitDataProps {
  subjectId: string
  natalSubject: SubjectModel
  startDate: Date
  endDate: Date
  enabled?: boolean
  refreshTrigger?: number
  chartOptions?: ChartRequestOptions
}

export function useTransitData({
  subjectId,
  natalSubject,
  startDate,
  endDate,
  enabled = true,
  refreshTrigger = 0,
  chartOptions,
}: UseTransitDataProps) {
  const [data, setData] = useState<TransitDayData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })

  // Use a ref to track the current fetch operation ID to prevent race conditions
  const fetchIdRef = useRef(0)

  useEffect(() => {
    if (!enabled) return

    const loadData = async () => {
      const currentFetchId = ++fetchIdRef.current
      setIsLoading(true)
      setData([]) // Clear previous data when range changes

      // 1. Identify all months in the range
      const months: Date[] = []
      let current = startOfMonth(startDate)
      const end = endOfMonth(endDate)

      while (isBefore(current, end) || isSameMonth(current, end)) {
        months.push(current)
        current = addMonths(current, 1)
      }

      setProgress({ loaded: 0, total: months.length })

      const loadedMonthsData: Map<string, TransitDayData[]> = new Map()

      // 2. Iterate through months
      for (const monthDate of months) {
        if (fetchIdRef.current !== currentFetchId) break // Abort if new request started

        const monthStr = format(monthDate, 'yyyy-MM')

        // Check Cache
        const cachedData = await getCachedTransitMonth(subjectId, monthStr)

        if (cachedData) {
          loadedMonthsData.set(monthStr, cachedData)
          // Update state immediately with cached data
          updateState()
        } else {
          // Fetch from API (Server Action)
          const monthStart = startOfMonth(monthDate)
          const monthEnd = endOfMonth(monthDate)

          // Calculate actual fetch range (intersection of month and requested range)
          const fetchStart = monthStart.getTime() < startDate.getTime() ? startDate : monthStart
          const fetchEnd = monthEnd.getTime() > endDate.getTime() ? endDate : monthEnd

          clientLogger.debug('[useTransitData] Fetching range:', {
            monthStr,
            fetchStart: fetchStart.toISOString(),
            fetchEnd: fetchEnd.toISOString(),
          })

          try {
            // Call Server Action
            // We cast the result to any first to avoid strict type mismatch if types are imported from different files
            // but structurally they are identical.
            const fetchedData = (await getTransitRange(
              natalSubject,
              fetchStart,
              fetchEnd,
              chartOptions,
            )) as TransitDayData[]

            // Save to Cache (only if we fetched the full month)
            const isFullMonth = fetchStart.getTime() <= monthStart.getTime() && fetchEnd.getTime() >= monthEnd.getTime()

            if (isFullMonth) {
              await setCachedTransitMonth(subjectId, monthStr, fetchedData)
            }

            loadedMonthsData.set(monthStr, fetchedData)
            updateState()
          } catch (error) {
            clientLogger.error(`Failed to fetch transits for ${monthStr}`, error)
          }
        }

        setProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }))
      }

      function updateState() {
        const currentAllData: TransitDayData[] = []
        months.forEach((m) => {
          const mStr = format(m, 'yyyy-MM')
          const mData = loadedMonthsData.get(mStr)
          if (mData) {
            currentAllData.push(...mData)
          }
        })

        // Filter to exact requested range
        const filteredData = currentAllData.filter((d) => {
          const t = new Date(d.date).getTime()
          return t >= startOfDay(startDate).getTime() && t <= endOfDay(endDate).getTime()
        })

        setData(filteredData)
      }

      if (fetchIdRef.current === currentFetchId) {
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      // Cleanup if needed
    }
  }, [subjectId, startDate, endDate, enabled, natalSubject, refreshTrigger, chartOptions]) // Add chartOptions to dependencies

  return { data, isLoading, progress }
}
