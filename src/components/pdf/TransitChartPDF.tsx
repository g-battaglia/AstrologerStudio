import { Document, Page } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { PDFHeader } from './PDFHeader'
import { PDFDualSubjectSection } from './PDFDualSubjectSection'
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

export interface TransitChartPDFProps {
  /** Combined transit chart data */
  chartData: ChartData
  /** Natal chart data */
  natalChartData: ChartData
  /** Transit chart data (positions at transit time) */
  transitChartData: ChartData
  /** Aspects array (transit-to-natal) */
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
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * TransitChartPDF Document
 *
 * PDF document for Transit charts showing natal positions,
 * transit positions, and their interactions.
 */
export function TransitChartPDF({
  chartData,
  natalChartData,
  transitChartData: _transitChartData,
  aspects,
  chartWheelImage,
  notes,
  branding,
  options,
  dateFormat = 'EU',
  timeFormat = '24h',
}: TransitChartPDFProps) {
  const natalSubject = natalChartData.subject
  // Transit subject is stored in chartData.second_subject from getTransitChart
  const transitSubject = chartData.second_subject || chartData.subject
  const houseComparison = chartData.house_comparison

  return (
    <Document
      title={`${natalSubject.name} - Transit Report`}
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
          reportTitle="Transit Report"
          subtitle={natalSubject.name}
        />

        <PDFDualSubjectSection
          subject1={natalSubject}
          subject2={transitSubject}
          subject1Label="Natal Chart"
          subject2Label="Transits"
          dateFormat={dateFormat}
          timeFormat={timeFormat}
        />

        {options.includeChartWheel && chartWheelImage && (
          <PDFChartWheel imageData={chartWheelImage} caption={`${natalSubject.name}'s Transits`} />
        )}

        <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
      </Page>

      {/* Page 2: Natal Planetary Positions */}
      {options.includePlanets && (
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

      {/* Page 3: Transit Planetary Positions */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Transit Positions"
          />

          <PDFPlanetaryTable subject={transitSubject} title="Transit Planetary Positions" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 4: Natal House Cusps */}
      {options.includeHouses && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Natal Houses"
          />

          <PDFHousesTable subject={natalSubject} title="Natal House Cusps" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 5: Transit Planets in Natal Houses */}
      {houseComparison && houseComparison.second_points_in_first_houses && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="House Overlay"
          />

          <PDFHouseOverlayTable
            points={houseComparison.second_points_in_first_houses}
            title="Transit Planets in Natal Houses"
            description={`Where the transiting planets fall within ${natalSubject.name}'s natal house system`}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 6: Transit-to-Natal Aspects */}
      {options.includeAspects && aspects.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Transit Aspects"
          />

          <PDFAspectsSection aspects={aspects} title="Transit-to-Natal Aspects" maxAspects={80} />

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

          <PDFNotesSection notes={notes} title="Transit Interpretation" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}
    </Document>
  )
}
