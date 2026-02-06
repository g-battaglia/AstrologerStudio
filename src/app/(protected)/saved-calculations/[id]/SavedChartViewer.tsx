'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { getSavedChartData, type SavedChartDataResult } from '@/actions/saved-charts'
import type {
  SavedChartParams,
  TransitParams,
  SolarReturnParams,
  LunarReturnParams,
  ChartLocation,
} from '@/types/saved-chart-params'
import { NatalChart } from '@/components/charts/NatalChart'
import { TransitChart } from '@/components/charts/TransitChart'
import { SynastryChart } from '@/components/charts/SynastryChart'
import { CompositeChart } from '@/components/charts/CompositeChart'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { ExportPDFDialog, ExportTransitPDFDialog, ExportSynastryPDFDialog } from '@/components/pdf'
import { DateTimeLocationSelector } from '@/components/ui/DateTimeLocationSelector'
import type { LocationFormValues } from '@/components/SubjectLocationFields'
import { useChartPreferences } from '@/hooks/useChartPreferences'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/logging/client'

interface SavedChartViewerProps {
  chartName: string
  chartParams: SavedChartParams
  savedChartId: string
  initialNotes: string
}

export function SavedChartViewer({ chartName, chartParams, savedChartId, initialNotes }: SavedChartViewerProps) {
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [result, setResult] = useState<SavedChartDataResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notes, setNotes] = useState(initialNotes)
  const { dateFormat, timeFormat } = useChartPreferences()

  // State for modified chart params (used for time navigator)
  const [currentParams, setCurrentParams] = useState<SavedChartParams>(chartParams)
  const [isSaving, setIsSaving] = useState(false)

  // State for tracking last saved version to determine modifications
  const [lastSavedParams, setLastSavedParams] = useState<SavedChartParams>(chartParams)
  const [lastSavedNotes, setLastSavedNotes] = useState(initialNotes)

  // Check if params or notes have been modified from original
  const hasModifiedParams =
    JSON.stringify(currentParams) !== JSON.stringify(lastSavedParams) || notes !== lastSavedNotes

  // Refs to guard async state updates across unmounts and stale requests
  const isMountedRef = useRef(true)
  const latestRequestIdRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const loadData = useCallback(async () => {
    const requestId = ++latestRequestIdRef.current
    setIsLoading(true)
    try {
      const data = await getSavedChartData(currentParams, chartTheme)
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setResult(data)
      }
    } finally {
      if (isMountedRef.current && requestId === latestRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [currentParams, chartTheme])

  // Fetch chart data when params or theme changes
  useEffect(() => {
    void loadData()
  }, [loadData])

  // fetchData callback for retry button
  const fetchData = useCallback(() => {
    void loadData()
  }, [loadData])

  // Handle time navigator updates for transit charts
  const handleTransitTimeChange = useCallback(
    (data: { dateTime: string; location: LocationFormValues }) => {
      if (currentParams.type !== 'transit') return

      const newParams: TransitParams = {
        ...currentParams,
        transitDate: data.dateTime,
        transitLocation: {
          city: data.location.city ?? '',
          nation: data.location.nation ?? '',
          latitude: data.location.latitude ?? 0,
          longitude: data.location.longitude ?? 0,
          timezone: data.location.timezone ?? '0',
        },
      }
      setCurrentParams(newParams)
    },
    [currentParams],
  )

  // Handle time navigator updates for solar return charts
  const handleSolarReturnYearChange = useCallback(
    (data: { dateTime: string; location: LocationFormValues }) => {
      if (currentParams.type !== 'solar-return') return

      const year = new Date(data.dateTime).getFullYear()
      const newParams: SolarReturnParams = {
        ...currentParams,
        year,
        returnLocation: data.location.city
          ? {
              city: data.location.city,
              nation: data.location.nation ?? '',
              latitude: data.location.latitude ?? 0,
              longitude: data.location.longitude ?? 0,
              timezone: data.location.timezone ?? '0',
            }
          : undefined,
      }
      setCurrentParams(newParams)
    },
    [currentParams],
  )

  // Handle time navigator updates for lunar return charts
  const handleLunarReturnTimeChange = useCallback(
    (data: { dateTime: string; location: LocationFormValues }) => {
      if (currentParams.type !== 'lunar-return') return

      const newParams: LunarReturnParams = {
        ...currentParams,
        returnDatetime: data.dateTime,
        returnLocation: data.location.city
          ? {
              city: data.location.city,
              nation: data.location.nation ?? '',
              latitude: data.location.latitude ?? 0,
              longitude: data.location.longitude ?? 0,
              timezone: data.location.timezone ?? '0',
            }
          : undefined,
      }
      setCurrentParams(newParams)
    },
    [currentParams],
  )

  // Save modified params to database
  const handleSaveChanges = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/saved-charts/${savedChartId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartData: currentParams,
          notes,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        clientLogger.error('Save chart update failed:', { status: res.status, body: text })
        throw new Error('Failed to save changes')
      }

      toast.success('Chart updated successfully.')
      // Update local baseline state instead of reloading
      setLastSavedParams(currentParams)
      setLastSavedNotes(notes)
    } catch (error) {
      clientLogger.error('Error updating saved chart:', error)
      toast.error('Failed to save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Get current datetime and location for time navigator based on chart type
  const getTimeNavigatorProps = () => {
    if (currentParams.type === 'transit') {
      const params = currentParams as TransitParams
      return {
        defaultDateTime: params.transitDate,
        defaultLocation: params.transitLocation,
        onCalculate: handleTransitTimeChange,
        submitLabel: 'Update Transit',
        showNowButton: true,
      }
    }

    if (currentParams.type === 'solar-return') {
      const params = currentParams as SolarReturnParams
      // For solar return, create a date from the year
      const returnDate = new Date(params.year, 0, 1).toISOString()
      const location: ChartLocation = params.returnLocation ?? {
        city: '',
        nation: '',
        latitude: 0,
        longitude: 0,
        timezone: '0',
      }
      return {
        defaultDateTime: returnDate,
        defaultLocation: location,
        onCalculate: handleSolarReturnYearChange,
        submitLabel: 'Update Solar Return',
        showNowButton: false,
      }
    }

    if (currentParams.type === 'lunar-return') {
      const params = currentParams as LunarReturnParams
      const location: ChartLocation = params.returnLocation ?? {
        city: '',
        nation: '',
        latitude: 0,
        longitude: 0,
        timezone: '0',
      }
      return {
        defaultDateTime: params.returnDatetime,
        defaultLocation: location,
        onCalculate: handleLunarReturnTimeChange,
        submitLabel: 'Update Lunar Return',
        showNowButton: false,
      }
    }

    return null
  }

  const showTimeNavigator = ['transit', 'solar-return', 'lunar-return'].includes(currentParams.type)
  const timeNavigatorProps = getTimeNavigatorProps()

  if (isLoading && !result) {
    return (
      <div className="h-full w-full space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    )
  }

  if (!result || !result.success) {
    return <ChartErrorState error={result?.error || 'Failed to load chart data'} onRetry={fetchData} />
  }

  const renderChart = () => {
    switch (result.chartType) {
      case 'natal':
        return <NatalChart data={result.data} subjectId={'subjectId' in chartParams ? chartParams.subjectId : ''} />

      case 'transit':
        return (
          <TransitChart
            data={result.data}
            natalData={result.natalData!}
            transitData={result.transitData!}
            savedChartId={savedChartId}
            notes={notes}
            onNotesChange={setNotes}
          />
        )

      case 'synastry':
        return (
          <SynastryChart
            data={result.data}
            subject1Data={result.subject1Data!}
            subject2Data={result.subject2Data!}
            savedChartId={savedChartId}
            notes={notes}
            onNotesChange={setNotes}
          />
        )

      case 'composite':
        return <CompositeChart data={result.data} />

      case 'solar-return':
        if (result.subject1Data) {
          return (
            <SynastryChart
              data={result.data}
              subject1Data={result.subject1Data}
              subject2Data={result.data}
              savedChartId={savedChartId}
              chartTypeOverride="solar_return"
              subject2DateLabel="Solar Return Date and Time"
              notes={notes}
              onNotesChange={setNotes}
            />
          )
        }
        return (
          <NatalChart
            data={result.data}
            subjectId="saved-chart"
            chartTypeOverride="solar_return"
            dateLabel="Solar Return Date and Time"
            savedChartId={savedChartId}
            notes={notes}
            onNotesChange={setNotes}
          />
        )

      case 'lunar-return':
        if (result.subject1Data) {
          return (
            <SynastryChart
              data={result.data}
              subject1Data={result.subject1Data}
              subject2Data={result.data}
              savedChartId={savedChartId}
              chartTypeOverride="lunar_return"
              subject2DateLabel="Lunar Return Date and Time"
              notes={notes}
              onNotesChange={setNotes}
            />
          )
        }
        return (
          <NatalChart
            data={result.data}
            subjectId="saved-chart"
            chartTypeOverride="lunar_return"
            dateLabel="Lunar Return Date and Time"
            savedChartId={savedChartId}
            notes={notes}
            onNotesChange={setNotes}
          />
        )

      default:
        return <div>Unsupported chart type: {result.chartType}</div>
    }
  }

  const renderExportButton = () => {
    if (!result) return null

    switch (result.chartType) {
      case 'natal':
        return (
          <ExportPDFDialog
            chartData={result.data.chart_data}
            aspects={result.data.chart_data.aspects}
            chartWheelHtml={result.data.chart_wheel}
            notes={notes}
            size="icon"
          />
        )

      case 'transit':
        if (result.natalData && result.transitData) {
          return (
            <ExportTransitPDFDialog
              chartData={result.data.chart_data}
              natalChartData={result.natalData.chart_data}
              transitChartData={result.transitData.chart_data}
              aspects={result.data.chart_data.aspects}
              chartWheelHtml={result.data.chart_wheel}
              notes={notes}
              size="icon"
            />
          )
        }
        return null

      case 'synastry':
        if (result.subject1Data && result.subject2Data) {
          return (
            <ExportSynastryPDFDialog
              chartData={result.data.chart_data}
              subject1ChartData={result.subject1Data.chart_data}
              subject2ChartData={result.subject2Data.chart_data}
              aspects={result.data.chart_data.aspects}
              chartWheelHtml={result.data.chart_wheel}
              notes={notes}
              size="icon"
            />
          )
        }
        return null

      default:
        return null
    }
  }

  // Format subtitle based on chart type
  const getSubtitle = (): string | null => {
    if (!result) return null

    switch (currentParams.type) {
      case 'transit': {
        const params = currentParams as TransitParams
        return `Transits at ${formatDisplayDate(params.transitDate, dateFormat)} ${formatDisplayTime(params.transitDate, timeFormat)} • ${params.transitLocation.city}, ${params.transitLocation.nation}`
      }

      case 'synastry': {
        if (result.subject1Data && result.subject2Data) {
          const name1 = result.subject1Data.chart_data.subject.name
          const name2 = result.subject2Data.chart_data.subject.name
          return `Relationship between ${name1} & ${name2}`
        }
        return null
      }

      case 'composite': {
        if (result.subject1Data && result.subject2Data) {
          const name1 = result.subject1Data.chart_data.subject.name
          const name2 = result.subject2Data.chart_data.subject.name
          return `Composite chart for ${name1} & ${name2}`
        }
        return null
      }

      case 'solar-return': {
        const params = currentParams as SolarReturnParams
        if (result.subject1Data) {
          const name = result.subject1Data.chart_data.subject.name
          return `${name}'s Solar Return for ${params.year}`
        }
        return `Solar Return for ${params.year}`
      }

      case 'lunar-return': {
        const params = currentParams as LunarReturnParams
        if (result.subject1Data) {
          const name = result.subject1Data.chart_data.subject.name
          return `${name}'s Lunar Return at ${formatDisplayDate(params.returnDatetime, dateFormat)}`
        }
        return `Lunar Return at ${formatDisplayDate(params.returnDatetime, dateFormat)}`
      }

      case 'natal': {
        const name = result.data?.chart_data?.subject?.name
        return name ? `Natal chart for ${name}` : null
      }

      default:
        return null
    }
  }

  const subtitle = getSubtitle()

  return (
    <Tabs defaultValue="chart" className="space-y-3 p-0 md:p-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{chartName}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ChartTabsList hasData={true} hasInterpretation={true} />
          {renderExportButton()}
          {hasModifiedParams && (
            <Button variant="default" size="icon" onClick={handleSaveChanges} disabled={isSaving} title="Save changes">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Time Navigator for transit/solar-return/lunar-return charts */}
      {showTimeNavigator && timeNavigatorProps && (
        <DateTimeLocationSelector
          defaultDateTime={timeNavigatorProps.defaultDateTime}
          defaultLocation={timeNavigatorProps.defaultLocation}
          onCalculate={timeNavigatorProps.onCalculate}
          submitLabel={timeNavigatorProps.submitLabel}
          showNowButton={timeNavigatorProps.showNowButton}
        />
      )}

      {/* Loading overlay when fetching updated data */}
      <div className={isLoading ? 'opacity-50 transition-opacity duration-200' : ''}>{renderChart()}</div>
    </Tabs>
  )
}
