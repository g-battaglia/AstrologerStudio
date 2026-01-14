import { Document, Page } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { PDFHeader } from './PDFHeader'
import { PDFDualSubjectSection } from './PDFDualSubjectSection'
import { PDFSubjectSection } from './PDFSubjectSection'
import { PDFPlanetaryTable } from './PDFPlanetaryTable'
import { PDFHousesTable } from './PDFHousesTable'
import { PDFHouseOverlayTable } from './PDFHouseOverlayTable'
import { PDFAspectsSection } from './PDFAspectsSection'
import { PDFChartWheel } from './PDFChartWheel'
import { PDFNotesSection } from './PDFNotesSection'
import { PDFFooter } from './PDFFooter'
import type { ChartData, Aspect } from '@/types/astrology'
import type { BrandingType, PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

export interface LunarReturnPDFProps {
  /** Lunar Return chart data */
  chartData: ChartData
  /** Aspects array */
  aspects: Aspect[]
  /** Chart wheel image as base64 */
  chartWheelImage?: string | null
  /** Interpretation notes */
  notes?: string
  /** Whether this is a dual wheel (natal + return) */
  isDualWheel?: boolean
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
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * LunarReturnPDF Document
 *
 * PDF document for Lunar Return charts.
 * Supports both single wheel (return only) and dual wheel (natal + return).
 */
export function LunarReturnPDF({
  chartData,
  aspects,
  chartWheelImage,
  notes,
  isDualWheel = false,
  branding,
  options,
  dateFormat = 'EU',
  timeFormat = '24h',
}: LunarReturnPDFProps) {
  // For dual wheel, first_subject is natal, second_subject is return
  // For single wheel, subject is the return chart
  const isActualDual = isDualWheel && chartData.first_subject && chartData.second_subject

  const natalSubject = isActualDual ? chartData.first_subject! : null
  const returnSubject = isActualDual ? chartData.second_subject! : chartData.subject
  const houseComparison = chartData.house_comparison

  const subjectName = natalSubject?.name || returnSubject.name
  const reportTitle = 'Lunar Return Report'

  return (
    <Document
      title={`${subjectName} - ${reportTitle}`}
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
          subtitle={subjectName}
        />

        {isActualDual && natalSubject ? (
          <PDFDualSubjectSection
            subject1={natalSubject}
            subject2={returnSubject}
            subject1Label="Natal Chart"
            subject2Label="Lunar Return"
            dateFormat={dateFormat}
            timeFormat={timeFormat}
          />
        ) : (
          <PDFSubjectSection
            subject={returnSubject}
            dateLabel="Lunar Return"
            dateFormat={dateFormat}
            timeFormat={timeFormat}
          />
        )}

        {options.includeChartWheel && chartWheelImage && (
          <PDFChartWheel imageData={chartWheelImage} caption={`${subjectName}'s Lunar Return`} />
        )}

        <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
      </Page>

      {/* Page 2 (Dual): Natal Planetary Positions */}
      {isActualDual && options.includePlanets && natalSubject && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Natal Positions"
          />

          <PDFPlanetaryTable subject={natalSubject} title="Natal Planetary Positions" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 3: Lunar Return Planetary Positions */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Lunar Return Positions"
          />

          <PDFPlanetaryTable subject={returnSubject} title="Lunar Return Planetary Positions" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 4: Lunar Return House Cusps */}
      {options.includeHouses && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Lunar Return Houses"
          />

          <PDFHousesTable subject={returnSubject} title="Lunar Return House Cusps" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 5 (Dual): Return Planets in Natal Houses */}
      {isActualDual && houseComparison && houseComparison.second_points_in_first_houses && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="House Overlay"
          />

          <PDFHouseOverlayTable
            points={houseComparison.second_points_in_first_houses}
            title="Lunar Return Planets in Natal Houses"
            description={`Where the Lunar Return planets fall within ${subjectName}'s natal house system`}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 6: Aspects */}
      {options.includeAspects && aspects.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Lunar Return Aspects"
          />

          <PDFAspectsSection
            aspects={aspects}
            title={isActualDual ? 'Lunar Return to Natal Aspects' : 'Lunar Return Aspects'}
            maxAspects={80}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 7: Interpretation Notes */}
      {options.includeInterpretation && notes && notes.trim().length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Interpretation"
          />

          <PDFNotesSection notes={notes} title="Lunar Return Interpretation" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}
    </Document>
  )
}
