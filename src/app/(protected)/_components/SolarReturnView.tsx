'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjectById } from '@/actions/subjects'
import { useSolarReturnChart } from '@/hooks/useSolarReturnChart'
import { SolarReturnNavigator } from '@/components/ui/SolarReturnNavigator'
import { NatalChart } from '@/components/charts/NatalChart'
import { SynastryChart } from '@/components/charts/SynastryChart'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/ThemeProvider'
import { SolarReturnInput } from '@/lib/validation/planetary-return'
import { ChartResponse, EnrichedSubjectModel, PlanetaryReturnRequestOptions } from '@/types/astrology'
import { SaveChartButton } from '@/components/SaveChartButton'
import { ExportSolarReturnPDFDialog } from '@/components/pdf/ExportSolarReturnPDFDialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDateFormat } from '@/hooks/useDateFormat'
import { useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'

interface Props {
  subjectId: string
}

export function SolarReturnView({ subjectId }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [formData, setFormData] = useState<SolarReturnInput | null>(null)
  const [notes, setNotes] = useState('')
  const [wheelType, setWheelType] = useState<'single' | 'dual'>('dual')
  const [notesGeneratedForYear, setNotesGeneratedForYear] = useState<number | null>(null)
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
  } = useSolarReturnChart(
    subject,
    formData
      ? {
          ...formData,
          theme: chartTheme,
        }
      : undefined,
  )

  // Calculate next solar return year and default values
  const defaultValues = useMemo(() => {
    if (!subject) return null

    const now = new Date()
    const birthDate = new Date(subject.birth_datetime)
    const birthMonth = birthDate.getMonth()
    const birthDay = birthDate.getDate()

    // Create date for birthday in current year
    const birthdayThisYear = new Date(now.getFullYear(), birthMonth, birthDay)

    const nextYear = now >= birthdayThisYear ? now.getFullYear() + 1 : now.getFullYear()

    return {
      year: nextYear,
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

  const handleSubmit = (data: SolarReturnInput, options?: Partial<PlanetaryReturnRequestOptions>) => {
    if (!subject) return
    // If options contain iso_datetime, use it to override year-based calculation
    if (options?.iso_datetime) {
      setFormData({ ...data, iso_datetime: options.iso_datetime } as SolarReturnInput & { iso_datetime?: string })
    } else {
      setFormData(data)
    }
  }

  // Track notes changes and the year they were generated for
  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
    // When notes are set (generated or edited), track the current year
    if (newNotes && formData?.year) {
      setNotesGeneratedForYear(formData.year)
    } else if (!newNotes) {
      // Reset when notes are cleared
      setNotesGeneratedForYear(null)
    }
  }

  // Determine if notes are stale (generated for a different year than currently displayed)
  const isDataStale = Boolean(
    notes && notesGeneratedForYear !== null && formData?.year && notesGeneratedForYear !== formData.year,
  )

  if (isLoadingSubject) {
    return (
      <div className="space-y-8 p-0 md:p-2">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (subjectError || !subject || !defaultValues) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Subject not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  // Helper to construct ChartResponse for SynastryChart sub-components
  // Accepts optional activePoints to populate the planetary positions table
  const getSubChartData = (subSubject: EnrichedSubjectModel, activePoints?: string[]): ChartResponse => ({
    status: 'OK',
    chart_data: {
      subject: subSubject,
      chart_type: 'Natal',
      aspects: [], // Not needed for the sub-cards
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

  const handleWheelTypeChange = (value: 'single' | 'dual') => {
    setWheelType(value)
    // Trigger recalculation with new wheel type
    if (formData) {
      setFormData({ ...formData, wheel_type: value })
    }
  }

  return (
    <Tabs defaultValue="chart" className="space-y-6 p-0 md:p-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Solar Return for {subject.name}</h1>
            <p className="text-muted-foreground">
              {(() => {
                const returnDatetime =
                  chartData?.chart_data.second_subject?.iso_formatted_utc_datetime ||
                  chartData?.chart_data.subject?.iso_formatted_utc_datetime
                if (returnDatetime) {
                  const time = formatDisplayTime(returnDatetime, timeFormat)
                  return `${formatDisplayDate(returnDatetime, dateFormat)} ${time} • ${formData?.return_location?.city}, ${formData?.return_location?.nation}`
                }
                return formData ? 'Calculating...' : 'Calculate Solar Return Chart'
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
                  type: 'solar-return',
                  subjectId,
                  year: formData.year,
                  wheelType: formData.wheel_type || 'dual',
                  returnLocation: formData.return_location,
                }}
                chartType="solar-return"
                defaultName={`${subject.name} - Solar Return ${formData.year}`}
                notes={notes}
              />
            )}
            {chartData && (
              <ExportSolarReturnPDFDialog
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

      <SolarReturnNavigator
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
                chartTypeOverride="solar_return"
                dateLabel="Solar Return Date and Time"
                isDataStale={isDataStale}
                staleDataLabel={notesGeneratedForYear ? `Return for ${notesGeneratedForYear}` : undefined}
              />
            ) : // For dual wheel, we use SynastryChart but we need to adapt the data
            // The API returns first_subject and second_subject in chart_data
            chartData.chart_data.first_subject && chartData.chart_data.second_subject ? (
              <SynastryChart
                data={chartData}
                subject1Data={getSubChartData(chartData.chart_data.first_subject, chartData.chart_data.active_points)}
                subject2Data={getSubChartData(chartData.chart_data.second_subject, chartData.chart_data.active_points)}
                notes={notes}
                onNotesChange={handleNotesChange}
                chartTypeOverride="solar_return"
                subject1DateLabel="Birth Date and Time"
                subject2DateLabel="Solar Return Date and Time"
                isDataStale={isDataStale}
                staleDataLabel={notesGeneratedForYear ? `Return for ${notesGeneratedForYear}` : undefined}
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
