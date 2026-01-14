'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { fetchEphemeris } from '@/lib/api/transits'
import type { EphemerisArray } from '@/types/ephemeris'

export type UseEphemerisDataOptions = {
  token?: string | null
  enabled?: boolean
  startDate?: Date
  endDate?: Date
  activePoints?: string[]
}

export function useEphemerisData(options: UseEphemerisDataOptions = {}) {
  const { token = null, enabled = true, startDate, endDate, activePoints } = options

  const [data, setData] = useState<EphemerisArray>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const shouldSkipCacheRef = useRef(false)

  const handleProgress = useCallback(
    (progressiveData: EphemerisArray, progressInfo: { current: number; total: number }) => {
      setData(progressiveData)
      setProgress(progressInfo)
    },
    [],
  )

  useEffect(() => {
    if (!enabled) return

    const abortController = new AbortController()
    const skipCache = shouldSkipCacheRef.current

    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      setData([])
      setProgress({ current: 0, total: 0 })

      try {
        await fetchEphemeris({
          token,
          signal: abortController.signal,
          skipCache,
          onProgress: handleProgress,
          startDate,
          endDate,
          chartOptions: activePoints ? { active_points: activePoints } : undefined,
        })
      } catch (err) {
        if (err instanceof Error && err.message !== 'Request aborted') {
          setError(err)
        }
      } finally {
        setIsLoading(false)
        shouldSkipCacheRef.current = false // Reset ref for next time
      }
    }

    loadData()

    return () => {
      abortController.abort()
    }
  }, [token, enabled, refreshTrigger, handleProgress, startDate, endDate, activePoints])

  const refetch = () => {
    shouldSkipCacheRef.current = true
    setRefreshTrigger((c) => c + 1)
  }

  return {
    data,
    isLoading,
    error,
    progress,
    refetch,
  }
}
