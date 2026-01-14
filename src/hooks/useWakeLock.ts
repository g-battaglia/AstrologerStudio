'use client'

import { useRef, useCallback } from 'react'
import { clientLogger } from '@/lib/logging/client'

/**
 * Hook to manage Screen Wake Lock API to prevent screen from sleeping
 * during AI generation or other long-running operations.
 *
 * @example
 * const { request, release, isSupported } = useWakeLock()
 *
 * // Start generation
 * await request()
 * try {
 *   await generateAI()
 * } finally {
 *   release()
 * }
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  const request = useCallback(async () => {
    if (!isSupported) {
      clientLogger.debug('Wake Lock API not supported')
      return false
    }

    try {
      // Release any existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      }

      wakeLockRef.current = await navigator.wakeLock.request('screen')
      clientLogger.debug('Wake lock acquired')

      // Handle visibility change - re-acquire lock when tab becomes visible again
      wakeLockRef.current.addEventListener('release', () => {
        clientLogger.debug('Wake lock released')
        wakeLockRef.current = null
      })

      return true
    } catch (error) {
      clientLogger.error('Failed to acquire wake lock:', error)
      return false
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        clientLogger.debug('Wake lock released manually')
      } catch (error) {
        clientLogger.error('Failed to release wake lock:', error)
      }
    }
  }, [])

  return {
    request,
    release,
    isSupported,
  }
}
