'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjectById } from '@/actions/subjects'
import { useLunarReturnChart } from '@/hooks/useLunarReturnChart'
import { LunarReturnNavigator } from '@/components/ui/LunarReturnNavigator'
import { NatalChart } from '@/components/charts/NatalChart'
import { SynastryChart } from '@/components/charts/SynastryChart'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/ThemeProvider'
import { LunarReturnInput } from '@/lib/validation/planetary-return'
import { ChartResponse, EnrichedSubjectModel, PlanetaryReturnRequestOptions } from '@/types/astrology'
import { SaveChartButton } from '@/components/SaveChartButton'
import { ExportLunarReturnPDFDialog } from '@/components/pdf/ExportLunarReturnPDFDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDateFormat } from '@/hooks/useDateFormat'
import { useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'

interface Props {
  subjectId: string
}

export function LunarReturnView({ subjectId }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [formData, setFormData] = useState<LunarReturnInput | null>(null)
  const [notes, setNotes] = useState('')
  const [wheelType, setWheelType] = useState<'single' | 'dual'>('dual')
  const [notesGeneratedForDatetime, setNotesGeneratedForDatetime] = useState<string | null>(null)
  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()

  const {
    data: subject,
    isLoading: isLoadingSubject,
    error: subjectError,
  } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubjectById(subjectId),
  })

  const {
    data: chartData,
    isLoading: isLoadingChart,
    error: chartError,
    refetch,
  } = useLunarReturnChart(
    subject,
    formData
      ? {
          ...formData,
          theme: chartTheme,
        }
      : undefined,
  )

  const _onSubmit = (_data: LunarReturnInput) => {
    if (!subject) return
    // Assuming getLunarReturnChart is a function that takes subject and data,
    // and internally updates the state or triggers the chart calculation.
    // This part of the instruction seems to imply a different hook or state management
    // than the existing `setFormData` which is used by `useLunarReturnChart`.
    // For now, I'll keep the existing `handleSubmit` logic and add this new `onSubmit`
    // as per the instruction's placement, but note it's not currently used by the form.
    // If the intent was to replace `handleSubmit`, the instruction should have specified that.
    // If `getLunarReturnChart` is meant to be a new function, it would need to be defined.
    // As per the instruction, I'm inserting the code block as provided.
    // getLunarReturnChart({
    //   subject,
    //   ...data,
    // })
  }

  // Calculate default values
  const defaultValues = useMemo(() => {
    if (!subject) return null
    return {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      wheel_type: 'dual' as const,
      return_location: {
        city: subject.city || '',
        nation: subject.nation || '',
        latitude: subject.latitude || 0,
        longitude: subject.longitude || 0,
        timezone: subject.timezone || 'UTC',
      },
    }
  }, [subject])

  // Auto-calculate on load
  useEffect(() => {
    if (subject && defaultValues && !formData) {
      setFormData(defaultValues)
    }
  }, [subject, defaultValues, formData])

  const handleSubmit = (data: LunarReturnInput, options?: Partial<PlanetaryReturnRequestOptions>) => {
    // If options contain iso_datetime, use it to override month-based calculation
    if (options?.iso_datetime) {
      setFormData({ ...data, iso_datetime: options.iso_datetime } as LunarReturnInput & { iso_datetime?: string })
    } else {
      setFormData(data)
    }
  }

  // Get current chart datetime key for staleness comparison
  const currentChartDatetime =
    chartData?.chart_data.second_subject?.iso_formatted_utc_datetime ||
    chartData?.chart_data.subject?.iso_formatted_utc_datetime ||
    null

  // Track notes changes and the datetime they were generated for
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    // When notes are set (generated or edited), track the current datetime
    if (newNotes && currentChartDatetime) {
      setNotesGeneratedForDatetime(currentChartDatetime)
    } else if (!newNotes) {
      // Reset when notes are cleared
      setNotesGeneratedForDatetime(null)
    }
  }

  // Normalize datetime to minute precision for comparison (ignores seconds/milliseconds)
  const normalizeToMinute = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`
  }

  // Determine if notes are stale (generated for a different return than currently displayed)
  const isDataStale = Boolean(
    notes &&
    notesGeneratedForDatetime !== null &&
    currentChartDatetime &&
    normalizeToMinute(notesGeneratedForDatetime) !== normalizeToMinute(currentChartDatetime),
  )

  // Helper to construct ChartResponse for SynastryChart sub-components
  // Accepts optional activePoints to populate the planetary positions table
  const getSubChartData = (subSubject: EnrichedSubjectModel, activePoints?: string[]): ChartResponse => ({
    status: 'OK',
    chart_data: {
      subject: subSubject,
      chart_type: 'Natal',
      aspects: [],
      element_distribution: {
        fire: 0,
        earth: 0,
        air: 0,
        water: 0,
        fire_percentage: 0,
        earth_percentage: 0,
        air_percentage: 0,
        water_percentage: 0,
      },
      quality_distribution: {
        cardinal: 0,
        fixed: 0,
        mutable: 0,
        cardinal_percentage: 0,
        fixed_percentage: 0,
        mutable_percentage: 0,
      },
      active_points: activePoints ?? [],
      active_aspects: [],
      houses_names_list: [],
      lunar_phase: subSubject.lunar_phase ?? {
        degrees_between_s_m: 0,
        moon_phase: 0,
        moon_emoji: '',
        moon_phase_name: '',
      },
    },
  })

  if (isLoadingSubject) {
    return (
      <div className="space-y-8 p-0 md:p-2">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  const handleWheelTypeChange = (value: 'single' | 'dual') => {
    setWheelType(value)
    // Trigger recalculation with new wheel type
    if (formData) {
      setFormData({ ...formData, wheel_type: value })
    }
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

  const monthName = formData
    ? new Date(formData.year, formData.month - 1).toLocaleString('en-US', { month: 'long' })
    : ''

  return (
    <Tabs defaultValue="chart" className="space-y-6 p-0 md:p-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lunar Return for {subject.name}</h1>
            <p className="text-muted-foreground">
              {(() => {
                const returnDatetime =
                  chartData?.chart_data.second_subject?.iso_formatted_utc_datetime ||
                  chartData?.chart_data.subject?.iso_formatted_utc_datetime
                if (returnDatetime) {
                  const time = formatDisplayTime(returnDatetime, timeFormat)
                  return `${formatDisplayDate(returnDatetime, dateFormat)} ${time} • ${formData?.return_location?.city}, ${formData?.return_location?.nation}`
                }
                return formData ? 'Calculating...' : 'Calculate Lunar Return Chart'
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chartData && <ChartTabsList hasData={true} hasInterpretation={isAIGloballyEnabled()} />}
          <div className="flex items-center gap-2 ml-auto">
            <div className="md:hidden">
              <Select value={wheelType} onValueChange={handleWheelTypeChange}>
                <SelectTrigger className="w-[70px] sm:w-[140px] h-9">
                  <span className="sm:hidden">{wheelType === 'dual' ? '2W' : '1W'}</span>
                  <span className="hidden sm:inline">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dual">Dual Wheel</SelectItem>
                  <SelectItem value="single">Single Wheel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {chartData && formData && (
              <SaveChartButton
                chartParams={{
                  type: 'lunar-return',
                  subjectId,
                  returnDatetime:
                    chartData.chart_data.second_subject?.iso_formatted_utc_datetime ||
                    chartData.chart_data.subject?.iso_formatted_utc_datetime ||
                    '',
                  wheelType: formData.wheel_type || 'dual',
                  returnLocation: formData.return_location,
                }}
                chartType="lunar-return"
                defaultName={`${subject.name} - Lunar Return ${monthName} ${formData.year}`}
                notes={notes}
              />
            )}
            {chartData && (
              <ExportLunarReturnPDFDialog
                chartData={chartData.chart_data}
                aspects={chartData.chart_data.aspects}
                chartWheelHtml={chartData.chart_wheel}
                notes={notes}
                isDualWheel={formData?.wheel_type === 'dual'}
                dateFormat={dateFormat}
                timeFormat={timeFormat}
                size="icon"
              />
            )}
          </div>
        </div>
      </div>

      <LunarReturnNavigator
        defaultValues={formData || defaultValues!}
        onCalculate={handleSubmit}
        isLoading={isLoadingChart}
        wheelType={wheelType}
        onWheelTypeChange={handleWheelTypeChange}
        currentReturnDatetime={
          chartData?.chart_data.second_subject?.iso_formatted_utc_datetime ||
          chartData?.chart_data.subject?.iso_formatted_utc_datetime
        }
      />

      {isLoadingChart && !chartData && (
        <div className="space-y-8">
          <Skeleton className="h-[500px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      )}

      {chartError && <ChartErrorState error={chartError} onRetry={() => refetch()} />}

      {chartData && (
        <div className="space-y-6">
          <div className={isLoadingChart ? 'opacity-50 transition-opacity duration-200' : ''}>
            {formData?.wheel_type === 'single' ? (
              <NatalChart
                data={chartData}
                subjectId={subjectId}
                notes={notes}
                onNotesChange={handleNotesChange}
                chartTypeOverride="lunar_return"
                dateLabel="Lunar Return Date and Time"
                isDataStale={isDataStale}
                staleDataLabel={
                  notesGeneratedForDatetime
                    ? `Return for ${formatDisplayDate(notesGeneratedForDatetime, dateFormat)}`
                    : undefined
                }
              />
            ) : chartData.chart_data.first_subject && chartData.chart_data.second_subject ? (
              <SynastryChart
                data={chartData}
                subject1Data={getSubChartData(chartData.chart_data.first_subject, chartData.chart_data.active_points)}
                subject2Data={getSubChartData(chartData.chart_data.second_subject, chartData.chart_data.active_points)}
                notes={notes}
                onNotesChange={handleNotesChange}
                chartTypeOverride="lunar_return"
                subject1DateLabel="Birth Date and Time"
                subject2DateLabel="Lunar Return Date and Time"
                isDataStale={isDataStale}
                staleDataLabel={
                  notesGeneratedForDatetime
                    ? `Return for ${formatDisplayDate(notesGeneratedForDatetime, dateFormat)}`
                    : undefined
                }
              />
            ) : (
              <div>Invalid chart data for dual wheel</div>
            )}
          </div>
        </div>
      )}
    </Tabs>
  )
}
