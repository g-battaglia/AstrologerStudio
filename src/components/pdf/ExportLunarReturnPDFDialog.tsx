'use client'

import { useCallback } from 'react'
import { getLunarReturnChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, sanitizeFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportLunarReturnPDFDialogProps {
  /** Lunar Return chart data */
  chartData: ChartData
  /** Aspects array */
  aspects: Aspect[]
  /** Current chart wheel SVG HTML (fallback) */
  chartWheelHtml?: string
  /** Interpretation notes */
  notes?: string
  /** Whether this is a dual wheel chart */
  isDualWheel?: boolean
  /** Trigger button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Trigger button size */
  size?: 'default' | 'sm' | 'icon'
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/** Dialog options for lunar return chart export */
const LUNAR_RETURN_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Planetary Positions', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Cusps & Overlays', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Aspects', optionKey: 'includeAspects' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportLunarReturnPDFDialog Component
 *
 * Dialog for configuring and triggering PDF export of Lunar Return charts.
 */
export function ExportLunarReturnPDFDialog({
  chartData,
  aspects,
  chartWheelHtml,
  notes,
  isDualWheel = false,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportLunarReturnPDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    const natalSubject = chartData.first_subject
      ? enrichedSubjectToSubject(chartData.first_subject)
      : enrichedSubjectToSubject(chartData.subject)

    const returnSubject = chartData.second_subject || chartData.subject
    const returnIsoDatetime = returnSubject.iso_formatted_utc_datetime || returnSubject.iso_formatted_local_datetime

    const lightChartResponse: ChartResponse = await getLunarReturnChart(natalSubject, {
      theme: 'classic',
      iso_datetime: returnIsoDatetime,
      wheel_type: isDualWheel ? 'dual' : 'single',
      return_location: {
        city: returnSubject.city || '',
        nation: returnSubject.nation || '',
        latitude: returnSubject.lat ?? returnSubject.latitude ?? 0,
        longitude: returnSubject.lng ?? returnSubject.longitude ?? 0,
        timezone: returnSubject.tz_str || returnSubject.timezone || 'UTC',
      },
    })
    return lightChartResponse.chart_wheel || null
  }, [chartData.first_subject, chartData.second_subject, chartData.subject, isDualWheel])

  const generateFilename = useCallback((): string => {
    const returnSubject = chartData.second_subject || chartData.subject
    const subjectName = sanitizeFilename(chartData.first_subject?.name || returnSubject.name)
    const returnDate = returnSubject.iso_formatted_utc_datetime?.split('T')[0] || new Date().toISOString().split('T')[0]
    return `${subjectName}_lunar-return_${returnDate}.pdf`
  }, [chartData.first_subject, chartData.second_subject, chartData.subject])

  const renderPDF = useCallback(
    async (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => {
      const { LunarReturnPDF } = await import('./LunarReturnPDF')
      return (
        <LunarReturnPDF
          chartData={chartData}
          aspects={aspects}
          chartWheelImage={chartWheelImage}
          notes={exportOptions.includeInterpretation ? notes : undefined}
          isDualWheel={isDualWheel}
          branding={branding}
          options={exportOptions}
          dateFormat={dateFormatProp}
          timeFormat={timeFormatProp}
        />
      )
    },
    [chartData, aspects, notes, isDualWheel],
  )

  return (
    <ExportPDFDialogBase
      title="Export Lunar Return as PDF"
      description="Configure what to include in your Lunar Return report."
      chartType="lunar-return"
      successMessage="Lunar Return PDF exported successfully!"
      options={LUNAR_RETURN_OPTIONS}
      hasNotes={!!notes && notes.trim().length > 0}
      variant={variant}
      size={size}
      dateFormat={dateFormat}
      timeFormat={timeFormat}
      chartWheelHtml={chartWheelHtml}
      regenerateChart={regenerateChart}
      generateFilename={generateFilename}
      renderPDF={renderPDF}
    />
  )
}
