/**
 * Unit Tests for ChartViewWrapper Component
 *
 * Tests the wrapper component that handles loading and error states
 * for all chart view components in a consistent manner.
 *
 * @module src/components/charts/ChartViewWrapper
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'

// Mock next/navigation
const mockBack = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

// Import component after mocks are set up
import { ChartViewWrapper } from '@/components/charts/ChartViewWrapper'

describe('ChartViewWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('loading state', () => {
    it('should render loading skeleton when isLoading is true', () => {
      render(
        <ChartViewWrapper isLoading={true} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show skeleton elements
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)

      // Should not show children
      expect(screen.queryByText('Chart Content')).not.toBeInTheDocument()
    })

    it('should render skeleton with correct structure', () => {
      render(
        <ChartViewWrapper isLoading={true} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should have the container with space-y-4 class
      const container = document.querySelector('.space-y-4')
      expect(container).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe('error state', () => {
    it('should render error message when error is provided', () => {
      const error = new Error('Failed to fetch subject')

      render(
        <ChartViewWrapper isLoading={false} error={error} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show error message
      expect(screen.getByText('Subject not found')).toBeInTheDocument()

      // Should show Go Back button
      expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument()

      // Should not show children
      expect(screen.queryByText('Chart Content')).not.toBeInTheDocument()
    })

    it('should render error message when hasSubject is false', () => {
      render(
        <ChartViewWrapper isLoading={false} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show error message
      expect(screen.getByText('Subject not found')).toBeInTheDocument()
    })

    it('should render custom error message when provided', () => {
      render(
        <ChartViewWrapper isLoading={false} hasSubject={false} errorMessage="Subject(s) not found">
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show custom error message
      expect(screen.getByText('Subject(s) not found')).toBeInTheDocument()
    })

    it('should navigate back when Go Back button is clicked', () => {
      render(
        <ChartViewWrapper isLoading={false} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      const backButton = screen.getByRole('button', { name: 'Go Back' })
      fireEvent.click(backButton)

      expect(mockBack).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Success State
  // ===========================================================================

  describe('success state', () => {
    it('should render children when not loading and subject exists', () => {
      render(
        <ChartViewWrapper isLoading={false} hasSubject={true}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show children
      expect(screen.getByText('Chart Content')).toBeInTheDocument()

      // Should not show error or skeleton
      expect(screen.queryByText('Subject not found')).not.toBeInTheDocument()
      expect(document.querySelector('[class*="animate-pulse"]')).not.toBeInTheDocument()
    })

    it('should render complex children correctly', () => {
      render(
        <ChartViewWrapper isLoading={false} hasSubject={true}>
          <div>
            <h1>Chart Title</h1>
            <p>Chart description</p>
            <button>Action</button>
          </div>
        </ChartViewWrapper>,
      )

      expect(screen.getByText('Chart Title')).toBeInTheDocument()
      expect(screen.getByText('Chart description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Priority of States
  // ===========================================================================

  describe('state priority', () => {
    it('should prioritize loading state over error', () => {
      const error = new Error('Test error')

      render(
        <ChartViewWrapper isLoading={true} error={error} hasSubject={false}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show skeleton (loading takes priority)
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)

      // Should not show error
      expect(screen.queryByText('Subject not found')).not.toBeInTheDocument()
    })

    it('should prioritize loading state over success', () => {
      render(
        <ChartViewWrapper isLoading={true} hasSubject={true}>
          <div>Chart Content</div>
        </ChartViewWrapper>,
      )

      // Should show skeleton
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)

      // Should not show children
      expect(screen.queryByText('Chart Content')).not.toBeInTheDocument()
    })
  })
})
