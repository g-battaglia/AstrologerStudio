import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { formatDisplayDate, formatDisplayTime, type DateFormat, type TimeFormat } from '@/lib/utils/date'
import type { EnrichedSubjectModel } from '@/types/astrology'

interface PDFDualSubjectSectionProps {
  /** First subject (e.g., natal, person A) */
  subject1: EnrichedSubjectModel
  /** Second subject (e.g., transit, person B, return) */
  subject2: EnrichedSubjectModel
  /** Label for first subject */
  subject1Label?: string
  /** Label for second subject */
  subject2Label?: string
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * Format coordinates for display
 */
function formatCoordinate(value: number, isLatitude: boolean): string {
  const direction = isLatitude ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(4)}° ${direction}`
}

/**
 * Get datetime from subject
 */
function getSubjectDateTime(subject: EnrichedSubjectModel): string {
  return (
    subject.iso_formatted_local_datetime ||
    subject.iso_formatted_utc_datetime ||
    new Date(subject.year ?? 2000, (subject.month ?? 1) - 1, subject.day ?? 1).toISOString()
  )
}

/**
 * PDF Dual Subject Section
 *
 * Displays two subjects side by side for charts like Transit, Synastry, Returns
 */
export function PDFDualSubjectSection({
  subject1,
  subject2,
  subject1Label = 'Subject 1',
  subject2Label = 'Subject 2',
  dateFormat = 'EU',
  timeFormat = '24h',
}: PDFDualSubjectSectionProps) {
  const datetime1 = getSubjectDateTime(subject1)
  const datetime2 = getSubjectDateTime(subject2)

  const lat1 = subject1.lat ?? subject1.latitude ?? 0
  const lng1 = subject1.lng ?? subject1.longitude ?? 0
  const lat2 = subject2.lat ?? subject2.latitude ?? 0
  const lng2 = subject2.lng ?? subject2.longitude ?? 0

  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {/* Subject 1 */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>{subject1Label}</Text>
          <Text style={styles.cardSubtitle}>{subject1.name}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDisplayDate(datetime1, dateFormat)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{formatDisplayTime(datetime1, timeFormat)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>
              {subject1.city}, {subject1.nation}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Latitude:</Text>
            <Text style={styles.detailValue}>{formatCoordinate(lat1, true)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Longitude:</Text>
            <Text style={styles.detailValue}>{formatCoordinate(lng1, false)}</Text>
          </View>
        </View>

        {/* Subject 2 */}
        <View style={[styles.card, { flex: 1 }]}>
          <Text style={styles.cardTitle}>{subject2Label}</Text>
          <Text style={styles.cardSubtitle}>{subject2.name}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{formatDisplayDate(datetime2, dateFormat)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>{formatDisplayTime(datetime2, timeFormat)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>
              {subject2.city}, {subject2.nation}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Latitude:</Text>
            <Text style={styles.detailValue}>{formatCoordinate(lat2, true)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Longitude:</Text>
            <Text style={styles.detailValue}>{formatCoordinate(lng2, false)}</Text>
          </View>
        </View>
      </View>
    </View>
  )
}
