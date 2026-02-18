'use client'

import { useCallback } from 'react'
import { getSolarReturnChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, sanitizeFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportSolarReturnPDFDialogProps {
  /** Solar Return chart data */
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

/** Dialog options for solar return chart export */
const SOLAR_RETURN_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Planetary Positions', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Cusps & Overlays', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Aspects', optionKey: 'includeAspects' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportSolarReturnPDFDialog Component
 *
 * Dialog for configuring and triggering PDF export of Solar Return charts.
 */
export function ExportSolarReturnPDFDialog({
  chartData,
  aspects,
  chartWheelHtml,
  notes,
  isDualWheel = false,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportSolarReturnPDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    const natalSubject = chartData.first_subject
      ? enrichedSubjectToSubject(chartData.first_subject)
      : enrichedSubjectToSubject(chartData.subject)

    const returnSubject = chartData.second_subject || chartData.subject
    const returnYear = returnSubject.year || new Date().getFullYear()

    const lightChartResponse: ChartResponse = await getSolarReturnChart(natalSubject, {
      theme: 'classic',
      year: returnYear,
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
    const returnYear = returnSubject.year || new Date().getFullYear()
    return `${subjectName}_solar-return_${returnYear}.pdf`
  }, [chartData.first_subject, chartData.second_subject, chartData.subject])

  const renderPDF = useCallback(
    async (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => {
      const { SolarReturnPDF } = await import('./SolarReturnPDF')
      return (
        <SolarReturnPDF
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
      title="Export Solar Return as PDF"
      description="Configure what to include in your Solar Return report."
      chartType="solar-return"
      successMessage="Solar Return PDF exported successfully!"
      options={SOLAR_RETURN_OPTIONS}
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
