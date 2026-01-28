'use client'

import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import { Printer, Loader2, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { LunarReturnPDF } from './LunarReturnPDF'
import { usePDFBranding } from '@/stores/pdfBrandingStore'
import { getLunarReturnChart } from '@/actions/astrology'
import { trackPdfExport } from '@/actions/pdf-tracking'
import type { ChartData, Aspect, ChartResponse, EnrichedSubjectModel } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
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

/**
 * Convert EnrichedSubjectModel to Subject for API calls
 */
function enrichedSubjectToSubject(enriched: EnrichedSubjectModel): Subject {
  const isoDate = enriched.iso_formatted_utc_datetime || enriched.iso_formatted_local_datetime
  const birthDatetime = isoDate
    ? new Date(isoDate)
    : new Date(
        enriched.year ?? new Date().getFullYear(),
        (enriched.month ?? 1) - 1,
        enriched.day ?? 1,
        enriched.hour ?? 0,
        enriched.minute ?? 0,
        0,
      )

  return {
    id: 'pdf-export-temp',
    name: enriched.name || 'Chart',
    birth_datetime: birthDatetime.toISOString(),
    city: enriched.city || '',
    nation: enriched.nation || '',
    latitude: enriched.lat ?? enriched.latitude ?? 0,
    longitude: enriched.lng ?? enriched.longitude ?? 0,
    timezone: enriched.tz_str || enriched.timezone || 'UTC',
    ownerId: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Convert SVG HTML string to a data URL for PDF embedding with WHITE BACKGROUND for print
 */
async function svgToDataUrl(svgHtml: string): Promise<string | null> {
  try {
    const container = document.createElement('div')
    container.innerHTML = svgHtml.trim()
    const svgElement = container.querySelector('svg')

    if (!svgElement) return null

    const width = parseInt(svgElement.getAttribute('width') || '500', 10)
    const height = parseInt(svgElement.getAttribute('height') || '500', 10)

    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')

    if (!ctx) return null

    ctx.scale(2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/png', 1.0)
        URL.revokeObjectURL(svgUrl)
        resolve(dataUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        resolve(null)
      }
      img.src = svgUrl
    })
  } catch {
    return null
  }
}

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
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const { brandingType, logoData, brandingText, showFooter, footerText, exportOptions, setExportOption } =
    usePDFBranding()

  const handleExport = useCallback(async () => {
    setIsGenerating(true)

    try {
      let chartWheelImage: string | null = null

      if (exportOptions.includeChartWheel) {
        // Derive subject from chart data
        const natalSubject = chartData.first_subject
          ? enrichedSubjectToSubject(chartData.first_subject)
          : enrichedSubjectToSubject(chartData.subject)

        // Get return datetime from second_subject or subject
        const returnSubject = chartData.second_subject || chartData.subject
        const returnIsoDatetime = returnSubject.iso_formatted_utc_datetime || returnSubject.iso_formatted_local_datetime

        try {
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

          if (lightChartResponse.chart_wheel) {
            chartWheelImage = await svgToDataUrl(lightChartResponse.chart_wheel)
          }
        } catch (err) {
          console.warn('Failed to regenerate lunar return chart with light theme:', err)
          if (chartWheelHtml) {
            chartWheelImage = await svgToDataUrl(chartWheelHtml)
          }
        }
      }

      const doc = (
        <LunarReturnPDF
          chartData={chartData}
          aspects={aspects}
          chartWheelImage={chartWheelImage}
          notes={exportOptions.includeInterpretation ? notes : undefined}
          isDualWheel={isDualWheel}
          branding={{
            type: brandingType,
            logoData,
            text: brandingText,
            showFooter,
            footerText,
          }}
          options={exportOptions}
          dateFormat={dateFormat}
          timeFormat={timeFormat}
        />
      )

      const blob = await pdf(doc).toBlob()

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const returnSubject = chartData.second_subject || chartData.subject
      const subjectName = (chartData.first_subject?.name || returnSubject.name).replace(/[^a-zA-Z0-9]/g, '_')
      const returnDate =
        returnSubject.iso_formatted_utc_datetime?.split('T')[0] || new Date().toISOString().split('T')[0]
      link.download = `${subjectName}_lunar_return_${returnDate}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Track PDF export (fire and forget - don't block the user)
      trackPdfExport('lunar-return').catch(() => {})

      toast.success('Lunar Return PDF exported successfully!')
      setOpen(false)
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('Failed to export PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [
    chartData,
    aspects,
    chartWheelHtml,
    notes,
    isDualWheel,
    brandingType,
    logoData,
    brandingText,
    showFooter,
    footerText,
    exportOptions,
    dateFormat,
    timeFormat,
  ])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} title="Export PDF">
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Lunar Return as PDF</DialogTitle>
          <DialogDescription>Configure what to include in your Lunar Return report.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Include in PDF</h4>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-chart" className="cursor-pointer">
                Chart Wheel
              </Label>
              <Switch
                id="include-chart"
                checked={exportOptions.includeChartWheel}
                onCheckedChange={(checked) => setExportOption('includeChartWheel', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-planets" className="cursor-pointer">
                Planetary Positions
              </Label>
              <Switch
                id="include-planets"
                checked={exportOptions.includePlanets}
                onCheckedChange={(checked) => setExportOption('includePlanets', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-houses" className="cursor-pointer">
                House Cusps & Overlays
              </Label>
              <Switch
                id="include-houses"
                checked={exportOptions.includeHouses}
                onCheckedChange={(checked) => setExportOption('includeHouses', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-aspects" className="cursor-pointer">
                Aspects
              </Label>
              <Switch
                id="include-aspects"
                checked={exportOptions.includeAspects}
                onCheckedChange={(checked) => setExportOption('includeAspects', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="include-interp" className="cursor-pointer">
                Interpretation Notes
              </Label>
              <Switch
                id="include-interp"
                checked={exportOptions.includeInterpretation}
                onCheckedChange={(checked) => setExportOption('includeInterpretation', checked)}
                disabled={!notes || notes.trim().length === 0}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Branding:{' '}
              {brandingType === 'logo' ? 'Custom Logo' : brandingType === 'text' ? 'Custom Text' : 'AstrologerStudio'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setOpen(false)
                window.location.href = '/settings#pdf-branding'
              }}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
