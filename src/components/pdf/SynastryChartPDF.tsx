import { Document, Page } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { PDFHeader } from './PDFHeader'
import { PDFDualSubjectSection } from './PDFDualSubjectSection'
import { PDFPlanetaryTable } from './PDFPlanetaryTable'
import { PDFHouseOverlayTable } from './PDFHouseOverlayTable'
import { PDFRelationshipScore } from './PDFRelationshipScore'
import { PDFAspectsSection } from './PDFAspectsSection'
import { PDFChartWheel } from './PDFChartWheel'
import { PDFNotesSection } from './PDFNotesSection'
import { PDFFooter } from './PDFFooter'
import type { ChartData, Aspect } from '@/types/astrology'
import type { BrandingType, PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

export interface SynastryChartPDFProps {
  /** Combined synastry chart data */
  chartData: ChartData
  /** Subject 1 chart data */
  subject1ChartData: ChartData
  /** Subject 2 chart data */
  subject2ChartData: ChartData
  /** Aspects array (inter-chart) */
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
 * SynastryChartPDF Document
 *
 * PDF document for Synastry charts showing both subjects,
 * relationship score, and inter-chart aspects.
 */
export function SynastryChartPDF({
  chartData,
  subject1ChartData,
  subject2ChartData,
  aspects,
  chartWheelImage,
  notes,
  branding,
  options,
  dateFormat = 'EU',
  timeFormat = '24h',
}: SynastryChartPDFProps) {
  const subject1 = subject1ChartData.subject
  const subject2 = subject2ChartData.subject
  const houseComparison = chartData.house_comparison
  const relationshipScore = chartData.relationship_score

  return (
    <Document
      title={`${subject1.name} & ${subject2.name} - Synastry Report`}
      author="AstrologerStudio"
      creator="AstrologerStudio"
      producer="@react-pdf/renderer"
    >
      {/* Page 1: Both Subjects & Chart Wheel */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          brandingType={branding.type}
          logoData={branding.logoData}
          brandingText={branding.text}
          reportTitle="Synastry Report"
          subtitle={`${subject1.name} & ${subject2.name}`}
        />

        <PDFDualSubjectSection
          subject1={subject1}
          subject2={subject2}
          subject1Label="Person A"
          subject2Label="Person B"
          dateFormat={dateFormat}
          timeFormat={timeFormat}
        />

        {options.includeChartWheel && chartWheelImage && (
          <PDFChartWheel imageData={chartWheelImage} caption={`${subject1.name} & ${subject2.name}`} />
        )}

        <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
      </Page>

      {/* Page 2: Relationship Score */}
      {options.includeRelationshipScore && relationshipScore && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Compatibility"
          />

          <PDFRelationshipScore
            scoreValue={relationshipScore.score_value}
            scoreDescription={relationshipScore.score_description}
            notes={relationshipScore.notes}
            scoreBreakdown={relationshipScore.score_breakdown}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 3: Subject 1 Planetary Positions */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle={`${subject1.name}'s Positions`}
          />

          <PDFPlanetaryTable subject={subject1} title={`${subject1.name}'s Planetary Positions`} />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 4: Subject 2 Planetary Positions */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle={`${subject2.name}'s Positions`}
          />

          <PDFPlanetaryTable subject={subject2} title={`${subject2.name}'s Planetary Positions`} />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 5: Subject 1's Planets in Subject 2's Houses */}
      {houseComparison && houseComparison.first_points_in_second_houses && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="House Overlay A→B"
          />

          <PDFHouseOverlayTable
            points={houseComparison.first_points_in_second_houses}
            title={`${subject1.name}'s Planets in ${subject2.name}'s Houses`}
            description={`Where ${subject1.name}'s planets fall in ${subject2.name}'s house system`}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 6: Subject 2's Planets in Subject 1's Houses */}
      {houseComparison && houseComparison.second_points_in_first_houses && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="House Overlay B→A"
          />

          <PDFHouseOverlayTable
            points={houseComparison.second_points_in_first_houses}
            title={`${subject2.name}'s Planets in ${subject1.name}'s Houses`}
            description={`Where ${subject2.name}'s planets fall in ${subject1.name}'s house system`}
          />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 7: Inter-Aspects */}
      {options.includeAspects && aspects.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Inter-Aspects"
          />

          <PDFAspectsSection aspects={aspects} title="Synastry Aspects" maxAspects={80} />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 8: Interpretation Notes */}
      {options.includeInterpretation && notes && notes.trim().length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Interpretation"
          />

          <PDFNotesSection notes={notes} title="Synastry Interpretation" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}
    </Document>
  )
}
