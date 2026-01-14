import { Document, Page } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { PDFHeader } from './PDFHeader'
import { PDFSubjectSection } from './PDFSubjectSection'
import { PDFPlanetaryTable } from './PDFPlanetaryTable'
import { PDFHousesTable } from './PDFHousesTable'
import { PDFAspectsSection } from './PDFAspectsSection'
import { PDFChartWheel } from './PDFChartWheel'
import { PDFNotesSection } from './PDFNotesSection'
import { PDFFooter } from './PDFFooter'
import type { ChartData, Aspect } from '@/types/astrology'
import type { BrandingType, PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

export interface NatalChartPDFProps {
  /** Chart data containing subject and calculations */
  chartData: ChartData
  /** Aspects array */
  aspects: Aspect[]
  /** Chart wheel image as base64 */
  chartWheelImage?: string | null
  /** Interpretation notes */
  notes?: string
  /** Branding settings */
  branding: {
    type: BrandingType
    logoData?: string | null
    text?: string
    showFooter: boolean
    footerText?: string
  }
  /** Export options */
  options: PDFExportOptions
  /** Report title */
  title?: string
  /** Chart type for title customization */
  chartType?: string
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * Get the report title based on chart type
 */
function getReportTitle(chartType?: string): string {
  switch (chartType) {
    case 'solar_return':
      return 'Solar Return Report'
    case 'lunar_return':
      return 'Lunar Return Report'
    case 'transit':
      return 'Transit Report'
    case 'synastry':
      return 'Synastry Report'
    case 'composite':
      return 'Composite Chart Report'
    default:
      return 'Natal Chart Report'
  }
}

/**
 * NatalChartPDF Document
 *
 * Main PDF document component that assembles all sections
 * into a professional print-ready report.
 *
 * Each major section is on its own page to avoid overflow issues
 * when there are many celestial points.
 */
export function NatalChartPDF({
  chartData,
  aspects,
  chartWheelImage,
  notes,
  branding,
  options,
  title,
  chartType,
  dateFormat = 'EU',
  timeFormat = '24h',
}: NatalChartPDFProps) {
  const reportTitle = title || getReportTitle(chartType)
  const subject = chartData.subject

  return (
    <Document
      title={`${subject.name} - ${reportTitle}`}
      author="AstrologerStudio"
      creator="AstrologerStudio"
      producer="@react-pdf/renderer"
    >
      {/* Page 1: Subject Details & Chart Wheel */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          brandingType={branding.type}
          logoData={branding.logoData}
          brandingText={branding.text}
          reportTitle={reportTitle}
          subtitle={subject.name}
        />

        <PDFSubjectSection
          subject={subject}
          dateLabel={chartType === 'solar_return' || chartType === 'lunar_return' ? 'Return Date' : undefined}
          dateFormat={dateFormat}
          timeFormat={timeFormat}
        />

        {options.includeChartWheel && chartWheelImage && (
          <PDFChartWheel
            imageData={chartWheelImage}
            caption={`${subject.name}'s ${reportTitle.replace(' Report', '')}`}
          />
        )}

        <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
      </Page>

      {/* Page 2: Planetary Positions (separate page to avoid overflow) */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Planetary Positions"
          />

          <PDFPlanetaryTable subject={subject} title="Planetary Positions" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 3: House Cusps (separate page) */}
      {options.includeHouses && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="House Cusps"
          />

          <PDFHousesTable subject={subject} title="House Cusps" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 4: Aspects */}
      {options.includeAspects && aspects.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Aspects"
          />

          <PDFAspectsSection aspects={aspects} title="Aspect Analysis" maxAspects={80} />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 5: Interpretation Notes */}
      {options.includeInterpretation && notes && notes.trim().length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Interpretation"
          />

          <PDFNotesSection notes={notes} title="Chart Interpretation" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}
    </Document>
  )
}
