'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

/**
 * Root providers component for the application
 *
 * @remarks
 * Wraps the app with:
 * - ErrorBoundary: Catches and handles React errors gracefully
 * - ThemeProvider: Handles dark/light mode theming
 * - PersistQueryClientProvider: Provides React Query with localStorage persistence
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
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
          },
        },
      }),
  )

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
