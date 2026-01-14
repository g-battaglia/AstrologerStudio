'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjectById } from '@/actions/subjects'
import { getTransitChart, getNatalChart } from '@/actions/astrology'
import { TransitChart } from '@/components/charts/TransitChart'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import type { Subject } from '@/types/subjects'
import { useTheme } from '@/components/ThemeProvider'
import { DateTimeLocationSelector } from '@/components/ui/DateTimeLocationSelector'
import type { LocationFormValues } from '@/components/SubjectLocationFields'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { SaveChartButton } from '@/components/SaveChartButton'
import { ExportTransitPDFDialog } from '@/components/pdf'
import { useDateFormat, useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'
import { generateChartId, deleteInterpretation } from '@/lib/cache/interpretations'
import { useCallback, useMemo } from 'react'

interface Props {
  subjectId: string
}

export function TransitChartView({ subjectId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [transitParams, setTransitParams] = useState<{ dateTime: string; location: LocationFormValues } | null>(null)
  const [notes, setNotes] = useState('')
  const [notesGeneratedForDatetime, setNotesGeneratedForDatetime] = useState<string | null>(null)
  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()
  // Fixed initial time to prevent infinite re-rendering
  const [initialNow] = useState(() => new Date())

  const dateParam = searchParams.get('date')

  const {
    data: subject,
    isLoading: isLoadingSubject,
    error: subjectError,
  } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubjectById(subjectId),
  })

  // Fetch Natal Data for the main subject
  const { data: natalData } = useQuery({
    queryKey: ['natal-chart', subjectId, chartTheme],
    queryFn: () => {
      if (!subject) throw new Error('Subject not found')
      return getNatalChart(subject, { theme: chartTheme })
    },
    enabled: !!subject,
    placeholderData: (previousData) => previousData,
  })

  // Create base date from URL param (if present) or from fixed initial time
  const baseDateIso = dateParam ? new Date(dateParam).toISOString() : initialNow.toISOString()

  // Create "Now" subject and fetch its natal data
  const effectiveTransitDate = transitParams ? transitParams.dateTime : baseDateIso
  const effectiveTransitLocation = transitParams
    ? transitParams.location
    : {
        city: subject?.city ?? '',
        nation: subject?.nation ?? '',
        latitude: subject?.latitude ?? 0,
        longitude: subject?.longitude ?? 0,
        timezone: subject?.timezone ?? '0',
      }

  const transitSubject: Subject = {
    id: 'transit-now',
    name: 'Transits Now',
    birth_datetime: effectiveTransitDate,
    city: effectiveTransitLocation.city ?? '',
    nation: effectiveTransitLocation.nation ?? '',
    latitude: effectiveTransitLocation.latitude ?? 0,
    longitude: effectiveTransitLocation.longitude ?? 0,
    timezone: effectiveTransitLocation.timezone ?? '0',
    ownerId: 'system',
    createdAt: initialNow,
    updatedAt: initialNow,
  }

  const { data: transitData } = useQuery({
    queryKey: ['natal-chart', 'transit-now', chartTheme, effectiveTransitDate, effectiveTransitLocation],
    queryFn: () => getNatalChart(transitSubject, { theme: chartTheme }),
    enabled: !!subject,
    placeholderData: (previousData) => previousData,
  })

  const {
    data: chartData,
    isLoading: isLoadingChart,
    isFetching: isFetchingChart,
    error: chartError,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ['transit-chart', subjectId, chartTheme, effectiveTransitDate, effectiveTransitLocation],
    queryFn: () => {
      if (!subject) throw new Error('Subject not found')
      return getTransitChart(subject, transitSubject, { theme: chartTheme })
    },
    enabled: !!subject,
    placeholderData: (previousData) => previousData,
  })

  // Track notes changes and the datetime they were generated for
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    // When notes are set (generated or edited), track the current datetime
    if (newNotes && effectiveTransitDate) {
      setNotesGeneratedForDatetime(effectiveTransitDate)
    } else if (!newNotes) {
      // Reset when notes are cleared
      setNotesGeneratedForDatetime(null)
    }
  }

  // Determine if notes are stale (generated for a different transit date than currently displayed)
  // We allow a 1 hour tolerance before showing the warning
  const isDataStale = Boolean(
    notes &&
    notesGeneratedForDatetime !== null &&
    effectiveTransitDate &&
    Math.abs(new Date(notesGeneratedForDatetime).getTime() - new Date(effectiveTransitDate).getTime()) > 60 * 60 * 1000,
  )

  // Generate chartId for cache operations (matching TransitChart's logic)
  const chartId = useMemo(() => {
    if (!natalData) return null
    const subjectName = natalData.chart_data.subject.name
    const natalDate = natalData.chart_data.subject.iso_formatted_utc_datetime || ''
    // Extract only date portion (YYYY-MM-DD) from transit datetime
    const transitDateFormatted = effectiveTransitDate.split('T')[0] || ''
    return generateChartId('transit', subjectName, natalDate, undefined, transitDateFormatted)
  }, [natalData, effectiveTransitDate])

  // Callback to clear cache when chart is saved to database
  const handleChartSaved = useCallback(async () => {
    if (chartId) {
      await deleteInterpretation(chartId)
    }
  }, [chartId])

  if (isLoadingSubject) {
    return (
      <div className="space-y-8 p-0 md:p-2">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (subjectError || !subject) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Subject not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="chart" className="space-y-3 p-0 md:p-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transits for {subject.name}</h1>
            <p className="text-muted-foreground">
              Transits at {formatDisplayDate(effectiveTransitDate, dateFormat)}{' '}
              {formatDisplayTime(effectiveTransitDate, timeFormat)} • {effectiveTransitLocation.city},{' '}
              {effectiveTransitLocation.nation}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ChartTabsList hasData={true} hasInterpretation={isAIGloballyEnabled()} />
          {chartData && natalData && transitData && (
            <SaveChartButton
              chartParams={{
                type: 'transit',
                subjectId,
                transitDate: effectiveTransitDate,
                transitLocation: {
                  city: effectiveTransitLocation.city ?? '',
                  nation: effectiveTransitLocation.nation ?? '',
                  latitude: effectiveTransitLocation.latitude ?? 0,
                  longitude: effectiveTransitLocation.longitude ?? 0,
                  timezone: effectiveTransitLocation.timezone ?? '0',
                },
              }}
              chartType="transit"
              defaultName={`${natalData.chart_data.subject.name}'s Transit Chart @ ${formatDisplayDate(effectiveTransitDate, dateFormat)}`}
              notes={notes}
              onSaved={handleChartSaved}
            />
          )}
          {chartData && natalData && transitData && (
            <ExportTransitPDFDialog
              chartData={chartData.chart_data}
              natalChartData={natalData.chart_data}
              transitChartData={transitData.chart_data}
              aspects={chartData.chart_data.aspects}
              chartWheelHtml={chartData.chart_wheel}
              notes={notes}
              size="icon"
            />
          )}
        </div>
      </div>

      <DateTimeLocationSelector
        defaultDateTime={baseDateIso}
        defaultLocation={{
          city: subject.city,
          nation: subject.nation,
          latitude: subject.latitude,
          longitude: subject.longitude,
          timezone: subject.timezone,
        }}
        onCalculate={setTransitParams}
        submitLabel="Update Transits"
      />

      {isLoadingChart && !chartData ? (
        <div className="space-y-8">
          <Skeleton className="h-[500px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : chartError ? (
        <ChartErrorState error={chartError} onRetry={() => refetchChart()} />
      ) : chartData && natalData && transitData ? (
        <div className={isFetchingChart ? 'opacity-50 transition-opacity duration-200' : ''}>
          <TransitChart
            data={chartData}
            natalData={natalData}
            transitData={transitData}
            notes={notes}
            onNotesChange={handleNotesChange}
            isDataStale={isDataStale}
            staleDataLabel={
              notesGeneratedForDatetime
                ? `Transits for ${formatDisplayDate(notesGeneratedForDatetime, dateFormat)} ${formatDisplayTime(notesGeneratedForDatetime, timeFormat)}`
                : undefined
            }
          />
        </div>
      ) : null}
    </Tabs>
  )
}
