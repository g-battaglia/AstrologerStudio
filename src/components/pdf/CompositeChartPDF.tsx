import { Document, Page, View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { PDFHeader } from './PDFHeader'
import { PDFPlanetaryTable } from './PDFPlanetaryTable'
import { PDFHousesTable } from './PDFHousesTable'
import { PDFAspectsSection } from './PDFAspectsSection'
import { PDFChartWheel } from './PDFChartWheel'
import { PDFNotesSection } from './PDFNotesSection'
import { PDFFooter } from './PDFFooter'
import type { ChartData, Aspect, EnrichedSubjectModel } from '@/types/astrology'
import type { BrandingType, PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'

export interface CompositeChartPDFProps {
  /** Composite chart data */
  chartData: ChartData
  /** First subject info (for source reference) */
  firstSubject?: EnrichedSubjectModel
  /** Second subject info (for source reference) */
  secondSubject?: EnrichedSubjectModel
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
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * Get datetime string from subject
 */
function getSubjectDateTime(subject: EnrichedSubjectModel): string {
  return (
    subject.iso_formatted_local_datetime ||
    subject.iso_formatted_utc_datetime ||
    new Date(subject.year ?? 2000, (subject.month ?? 1) - 1, subject.day ?? 1).toISOString()
  )
}

/**
 * CompositeChartPDF Document
 *
 * PDF document for Composite charts showing merged
 * midpoint positions from two subjects.
 */
export function CompositeChartPDF({
  chartData,
  firstSubject,
  secondSubject,
  aspects,
  chartWheelImage,
  notes,
  branding,
  options,
  dateFormat = 'EU',
  timeFormat = '24h',
}: CompositeChartPDFProps) {
  const compositeSubject = chartData.subject
  const subject1 = firstSubject || chartData.first_subject
  const subject2 = secondSubject || chartData.second_subject

  return (
    <Document
      title={`Composite Chart - ${subject1?.name || 'Person A'} & ${subject2?.name || 'Person B'}`}
      author="AstrologerStudio"
      creator="AstrologerStudio"
      producer="@react-pdf/renderer"
    >
      {/* Page 1: Source Subjects Info */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          brandingType={branding.type}
          logoData={branding.logoData}
          brandingText={branding.text}
          reportTitle="Composite Chart"
          subtitle={subject1 && subject2 ? `${subject1.name} & ${subject2.name}` : 'Relationship Composite'}
        />

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Source Charts</Text>
          <Text style={[styles.muted, { marginBottom: 12 }]}>
            This composite chart is calculated from the midpoints of the following two charts:
          </Text>

          <View style={{ flexDirection: 'row', gap: 16 }}>
            {/* Subject 1 */}
            {subject1 && (
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitle}>Person A</Text>
                <Text style={styles.cardSubtitle}>{subject1.name}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDisplayDate(getSubjectDateTime(subject1), dateFormat)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>{formatDisplayTime(getSubjectDateTime(subject1), timeFormat)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    {subject1.city}, {subject1.nation}
                  </Text>
                </View>
              </View>
            )}

            {/* Subject 2 */}
            {subject2 && (
              <View style={[styles.card, { flex: 1 }]}>
                <Text style={styles.cardTitle}>Person B</Text>
                <Text style={styles.cardSubtitle}>{subject2.name}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDisplayDate(getSubjectDateTime(subject2), dateFormat)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Time:</Text>
                  <Text style={styles.detailValue}>{formatDisplayTime(getSubjectDateTime(subject2), timeFormat)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>
                    {subject2.city}, {subject2.nation}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {options.includeChartWheel && chartWheelImage && (
          <PDFChartWheel imageData={chartWheelImage} caption="Composite Chart" />
        )}

        <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
      </Page>

      {/* Page 2: Composite Planetary Positions */}
      {options.includePlanets && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Composite Positions"
          />

          <PDFPlanetaryTable subject={compositeSubject} title="Composite Planetary Positions" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 3: Composite House Cusps */}
      {options.includeHouses && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Composite Houses"
          />

          <PDFHousesTable subject={compositeSubject} title="Composite House Cusps" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}

      {/* Page 4: Composite Aspects */}
      {options.includeAspects && aspects.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PDFHeader
            brandingType={branding.type}
            logoData={branding.logoData}
            brandingText={branding.text}
            reportTitle="Composite Aspects"
          />

          <PDFAspectsSection aspects={aspects} title="Composite Aspect Analysis" maxAspects={80} />

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

          <PDFNotesSection notes={notes} title="Composite Interpretation" />

          <PDFFooter showFooter={branding.showFooter} footerText={branding.footerText} />
        </Page>
      )}
    </Document>
  )
}
