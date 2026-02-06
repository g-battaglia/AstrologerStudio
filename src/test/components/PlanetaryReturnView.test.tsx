/**
 * Unit Tests for PlanetaryReturnView Component
 *
 * Verifies the unified component correctly handles both solar and lunar
 * return types, including labels, default values, and chart type overrides.
 *
 * @module src/app/(protected)/_components/PlanetaryReturnView
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('server-only', () => ({}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

vi.mock('@/lib/security/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))

// Mock hooks
const mockSubject = {
  id: 'subj-1',
  name: 'Test Subject',
  birth_datetime: '1990-06-15T12:30:00.000Z',
  city: 'London',
  nation: 'GB',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London',
}

const mockChartData = {
  status: 'OK' as const,
  chart_data: {
    chart_type: 'DualReturnChart',
    subject: { name: 'Test Subject', iso_formatted_utc_datetime: '2025-06-15T08:30:00Z' },
    first_subject: { name: 'Natal', iso_formatted_utc_datetime: '1990-06-15T12:30:00Z' },
    second_subject: { name: 'Return', iso_formatted_utc_datetime: '2025-06-15T08:30:00Z' },
    aspects: [],
    element_distribution: {
      fire: 3,
      earth: 2,
      air: 3,
      water: 2,
      fire_percentage: 30,
      earth_percentage: 20,
      air_percentage: 30,
      water_percentage: 20,
    },
    quality_distribution: {
      cardinal: 3,
      fixed: 4,
      mutable: 3,
      cardinal_percentage: 30,
      fixed_percentage: 40,
      mutable_percentage: 30,
    },
    active_points: ['Sun', 'Moon'],
    active_aspects: [],
    houses_names_list: [],
    lunar_phase: { degrees_between_s_m: 0, moon_phase: 0, moon_emoji: '', moon_phase_name: '' },
  },
  chart_wheel: '<svg></svg>',
}

vi.mock('@/hooks/useChartSubject', () => ({
  useChartSubject: vi.fn(() => ({
    data: mockSubject,
    isLoading: false,
    error: null,
  })),
}))

vi.mock('@/hooks/useChartTheme', () => ({
  useChartTheme: vi.fn(() => 'classic'),
}))

vi.mock('@/hooks/useChartPreferences', () => ({
  useChartPreferences: vi.fn(() => ({
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
  })),
}))

vi.mock('@/hooks/usePlanetaryReturnChart', () => ({
  usePlanetaryReturnChart: vi.fn(() => ({
    data: mockChartData,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

vi.mock('@/lib/ai/feature-flags', () => ({
  isAIGloballyEnabled: vi.fn(() => false),
}))

vi.mock('@/lib/utils/date', () => ({
  formatDisplayDate: vi.fn((date: string) => date),
  formatDisplayTime: vi.fn((_date: string) => '08:30'),
}))

// Mock child components to avoid deep rendering
vi.mock('@/components/charts/ChartViewWrapper', () => ({
  ChartViewWrapper: ({
    children,
    hasSubject,
  }: {
    children: React.ReactNode
    hasSubject: boolean
    isLoading: boolean
    error: unknown
  }) =>
    hasSubject ? (
      <div data-testid="chart-view-wrapper">{children}</div>
    ) : (
      <div data-testid="chart-view-wrapper-empty">No subject</div>
    ),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, ...props }: { children: React.ReactNode; defaultValue: string; className: string }) => (
    <div data-testid="tabs" {...props}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/charts/ChartTabs', () => ({
  ChartTabsList: () => <div data-testid="chart-tabs-list" />,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectValue: () => <span />,
}))

vi.mock('@/components/SaveChartButton', () => ({
  SaveChartButton: ({
    chartType,
    defaultName,
  }: {
    chartType: string
    defaultName: string
    chartParams: unknown
    notes: string
  }) => (
    <button data-testid="save-chart-button" data-chart-type={chartType} data-name={defaultName}>
      Save
    </button>
  ),
}))

vi.mock('@/components/pdf/ExportSolarReturnPDFDialog', () => ({
  ExportSolarReturnPDFDialog: () => <div data-testid="export-solar-pdf" />,
}))

vi.mock('@/components/pdf/ExportLunarReturnPDFDialog', () => ({
  ExportLunarReturnPDFDialog: () => <div data-testid="export-lunar-pdf" />,
}))

vi.mock('@/components/ui/SolarReturnNavigator', () => ({
  SolarReturnNavigator: () => <div data-testid="solar-navigator" />,
}))

vi.mock('@/components/ui/LunarReturnNavigator', () => ({
  LunarReturnNavigator: () => <div data-testid="lunar-navigator" />,
}))

vi.mock('@/components/charts/NatalChart', () => ({
  NatalChart: ({
    chartTypeOverride,
    dateLabel,
  }: {
    chartTypeOverride: string
    dateLabel: string
    data: unknown
    subjectId: string
    notes: string
    onNotesChange: unknown
    isDataStale: boolean
    staleDataLabel?: string
  }) => <div data-testid="natal-chart" data-chart-type={chartTypeOverride} data-date-label={dateLabel} />,
}))

vi.mock('@/components/charts/SynastryChart', () => ({
  SynastryChart: ({
    chartTypeOverride,
    subject2DateLabel,
  }: {
    chartTypeOverride: string
    subject2DateLabel: string
    data: unknown
    subject1Data: unknown
    subject2Data: unknown
    notes: string
    onNotesChange: unknown
    subject1DateLabel: string
    isDataStale: boolean
    staleDataLabel?: string
  }) => (
    <div data-testid="synastry-chart" data-chart-type={chartTypeOverride} data-subject2-label={subject2DateLabel} />
  ),
}))

vi.mock('@/components/ChartErrorState', () => ({
  ChartErrorState: () => <div data-testid="chart-error" />,
}))

// Import component after mocks
import { PlanetaryReturnView } from '@/app/(protected)/_components/PlanetaryReturnView'

// ============================================================================
// Tests
// ============================================================================

describe('PlanetaryReturnView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Solar Return
  // ===========================================================================

  describe('solar return type', () => {
    it('should render solar return heading', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      expect(screen.getByText('Solar Return for Test Subject')).toBeInTheDocument()
    })

    it('should render solar navigator', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      expect(screen.getByTestId('solar-navigator')).toBeInTheDocument()
      expect(screen.queryByTestId('lunar-navigator')).not.toBeInTheDocument()
    })

    it('should render solar PDF export dialog', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      expect(screen.getByTestId('export-solar-pdf')).toBeInTheDocument()
      expect(screen.queryByTestId('export-lunar-pdf')).not.toBeInTheDocument()
    })

    it('should pass solar-return chart type to save button', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      const saveButton = screen.getByTestId('save-chart-button')
      expect(saveButton).toHaveAttribute('data-chart-type', 'solar-return')
    })

    it('should pass solar-return chartTypeOverride to SynastryChart', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      const synastryChart = screen.getByTestId('synastry-chart')
      expect(synastryChart).toHaveAttribute('data-chart-type', 'solar-return')
    })

    it('should use Solar Return Date and Time as subject2 label', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      const synastryChart = screen.getByTestId('synastry-chart')
      expect(synastryChart).toHaveAttribute('data-subject2-label', 'Solar Return Date and Time')
    })
  })

  // ===========================================================================
  // Lunar Return
  // ===========================================================================

  describe('lunar return type', () => {
    it('should render lunar return heading', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      expect(screen.getByText('Lunar Return for Test Subject')).toBeInTheDocument()
    })

    it('should render lunar navigator', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      expect(screen.getByTestId('lunar-navigator')).toBeInTheDocument()
      expect(screen.queryByTestId('solar-navigator')).not.toBeInTheDocument()
    })

    it('should render lunar PDF export dialog', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      expect(screen.getByTestId('export-lunar-pdf')).toBeInTheDocument()
      expect(screen.queryByTestId('export-solar-pdf')).not.toBeInTheDocument()
    })

    it('should pass lunar-return chart type to save button', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      const saveButton = screen.getByTestId('save-chart-button')
      expect(saveButton).toHaveAttribute('data-chart-type', 'lunar-return')
    })

    it('should pass lunar-return chartTypeOverride to SynastryChart', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      const synastryChart = screen.getByTestId('synastry-chart')
      expect(synastryChart).toHaveAttribute('data-chart-type', 'lunar-return')
    })

    it('should use Lunar Return Date and Time as subject2 label', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="lunar" />)
      const synastryChart = screen.getByTestId('synastry-chart')
      expect(synastryChart).toHaveAttribute('data-subject2-label', 'Lunar Return Date and Time')
    })
  })

  // ===========================================================================
  // Shared Behavior
  // ===========================================================================

  describe('shared behavior', () => {
    it('should render chart tabs list when chart data exists', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      expect(screen.getByTestId('chart-tabs-list')).toBeInTheDocument()
    })

    it('should render synastry chart in dual wheel mode by default', () => {
      render(<PlanetaryReturnView subjectId="subj-1" returnType="solar" />)
      expect(screen.getByTestId('synastry-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('natal-chart')).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Wrapper Components (SolarReturnView / LunarReturnView)
  // ===========================================================================

  describe('wrapper re-exports', () => {
    it('SolarReturnView should render PlanetaryReturnView with solar type', async () => {
      const { SolarReturnView } = await import('@/app/(protected)/_components/SolarReturnView')
      render(<SolarReturnView subjectId="subj-1" />)
      expect(screen.getByText('Solar Return for Test Subject')).toBeInTheDocument()
    })

    it('LunarReturnView should render PlanetaryReturnView with lunar type', async () => {
      const { LunarReturnView } = await import('@/app/(protected)/_components/LunarReturnView')
      render(<LunarReturnView subjectId="subj-1" />)
      expect(screen.getByText('Lunar Return for Test Subject')).toBeInTheDocument()
    })
  })
})
