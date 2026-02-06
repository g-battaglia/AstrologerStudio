/**
 * Unit Tests for CheckoutSuccessHandler Component
 *
 * Tests the checkout success handler that syncs subscription status
 * after a successful payment and invalidates the subscription cache.
 *
 * @module src/components/CheckoutSuccessHandler
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the component
// ============================================================================

// Mock next/navigation
const mockReplace = vi.fn()
const mockSearchParams = new URLSearchParams()
const mockGetSearchParam = vi.fn((key: string) => mockSearchParams.get(key))
const mockPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGetSearchParam,
    toString: () => mockSearchParams.toString(),
    [Symbol.iterator]: () => mockSearchParams[Symbol.iterator](),
  }),
  usePathname: () => mockPathname,
}))

// Mock sonner toast
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

// Mock client logger
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock CongratulationsDialog
vi.mock('@/components/CongratulationsDialog', () => ({
  CongratulationsDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="congrats-dialog">Congrats!</div> : null,
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import the component after mocks are set up
import { CheckoutSuccessHandler } from '@/components/CheckoutSuccessHandler'

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function TestWrapper({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('CheckoutSuccessHandler', () => {
  let queryClient: QueryClient
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    mockSearchParams.delete('checkout')
    mockFetch.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    queryClient.clear()
    invalidateQueriesSpy.mockRestore()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render CongratulationsDialog (closed by default)', () => {
      const { container } = render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      // Dialog should not be visible when checkout param is not present
      expect(container.querySelector('[data-testid="congrats-dialog"]')).not.toBeInTheDocument()
    })

    it('should not trigger sync when checkout param is not present', async () => {
      mockGetSearchParam.mockReturnValue(null)

      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      // Wait a bit to ensure no async operations are triggered
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockFetch).not.toHaveBeenCalled()
      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
      expect(mockToastSuccess).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Checkout Success Flow Tests
  // ===========================================================================

  describe('checkout success flow', () => {
    beforeEach(() => {
      mockGetSearchParam.mockReturnValue('success')
    })

    it('should call subscription sync API when checkout=success', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/subscription/status?forceSync=true',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })
    })

    it('should invalidate subscription query cache on success', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['subscription'] })
      })
    })

    it('should only invalidate the subscription query key (not subscription-status)', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(invalidateQueriesSpy).toHaveBeenCalledTimes(1)
        expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['subscription'] })
        // Ensure orphan query key is NOT called
        expect(invalidateQueriesSpy).not.toHaveBeenCalledWith({ queryKey: ['subscription-status'] })
      })
    })

    it('should show success toast on successful sync', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Payment completed successfully!')
      })
    })

    it('should remove checkout param from URL after processing', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('error handling', () => {
    beforeEach(() => {
      mockGetSearchParam.mockReturnValue('success')
    })

    it('should handle sync failure gracefully without error toast', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      // Component handles errors silently (logs them but doesn't show error toast)
      // It still shows success toast immediately before the sync
      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Payment completed successfully!')
      })
    })

    it('should still remove checkout param from URL even on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard')
      })
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should not trigger when checkout param has different value', async () => {
      mockGetSearchParam.mockReturnValue('failed')

      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(mockFetch).not.toHaveBeenCalled()
      expect(invalidateQueriesSpy).not.toHaveBeenCalled()
    })

    it('should not process checkout twice due to isProcessing guard', async () => {
      mockGetSearchParam.mockReturnValue('success')

      const { rerender } = render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Rerender to simulate effect running again
      rerender(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      // Should still only have been called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
