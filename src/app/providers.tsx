'use client'

import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState, useEffect } from 'react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { clientLogger } from '@/lib/logging/client'
import { STALE_TIME, GC_TIME } from '@/lib/config/query'
import { cleanupExpiredCaches } from '@/lib/cache/cleanup'

/**
 * Global error handler for React Query mutations
 * Logs all mutation errors centrally for debugging and monitoring
 */
export function handleMutationError(error: Error): void {
  clientLogger.error('[React Query] Mutation error:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
  })
}

/**
 * Global error handler for React Query queries
 * Logs all query errors centrally for debugging and monitoring
 */
export function handleQueryError(error: Error): void {
  clientLogger.error('[React Query] Query error:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
  })
}

/**
 * Root providers component for the application
 *
 * @remarks
 * Wraps the app with:
 * - ErrorBoundary: Catches and handles React errors gracefully
 * - ThemeProvider: Handles dark/light mode theming
 * - QueryClientProvider: Provides React Query with global error handling
 * - Toaster: Global toast notifications
 * - ReactQueryDevtools: Query debugging tools (development only)
 *
 * @example
 * ```tsx
 * <Providers>
 *   <YourApp />
 * </Providers>
 * ```
 */

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleQueryError,
        }),
        mutationCache: new MutationCache({
          onError: handleMutationError,
        }),
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: STALE_TIME.MEDIUM, // 5 minutes
            gcTime: GC_TIME.DEFAULT, // 10 minutes
          },
        },
      }),
  )

  // Run cache cleanup once on app startup
  useEffect(() => {
    cleanupExpiredCaches()
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
          {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
