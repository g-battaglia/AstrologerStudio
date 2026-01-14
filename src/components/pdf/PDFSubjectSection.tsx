import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { formatDisplayDate, formatDisplayTime, type DateFormat, type TimeFormat } from '@/lib/utils/date'
import type { EnrichedSubjectModel } from '@/types/astrology'

interface PDFSubjectSectionProps {
  subject: EnrichedSubjectModel
  dateLabel?: string
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/**
 * Format coordinates for display with direction
 */
function formatLatitude(lat: number | undefined): string {
  if (lat === undefined) return 'Unknown'
  const dir = lat >= 0 ? 'N' : 'S'
  return `${Math.abs(lat).toFixed(4)}° ${dir}`
}

function formatLongitude(lng: number | undefined): string {
  if (lng === undefined) return 'Unknown'
  const dir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lng).toFixed(4)}° ${dir}`
}

/**
 * PDF Subject Section Component
 *
 * Displays the subject's birth details in a card-like layout.
 * Respects date and time format preferences.
 */
export function PDFSubjectSection({
  subject,
  dateLabel = 'Birth Date',
  dateFormat = 'EU',
  timeFormat = '24h',
}: PDFSubjectSectionProps) {
  const name = subject.name || 'Unknown'
  const city = subject.city || ''
  const nation = subject.nation || ''
  const location = [city, nation].filter(Boolean).join(', ') || 'Unknown'
  const timezone = subject.tz_str || subject.timezone || 'Unknown'
  const lat = subject.lat ?? subject.latitude
  const lng = subject.lng ?? subject.longitude
  const houseSystem = subject.houses_system_name || subject.houses_system_identifier || 'Placidus'
  const perspectiveType = subject.perspective_type || 'Geocentric'

  // Construct date object for formatting
  let dateObj: Date | null = null
  const { year, month, day, hour, minute } = subject

  if (year && month && day) {
    dateObj = new Date(Date.UTC(year, month - 1, day, hour ?? 0, minute ?? 0))
  } else if (subject.iso_formatted_utc_datetime) {
    dateObj = new Date(subject.iso_formatted_utc_datetime)
  }

  // Format date and time according to preferences
  const dateStr = dateObj ? formatDisplayDate(dateObj, dateFormat) : 'Unknown'
  const timeStr = dateObj ? formatDisplayTime(dateObj, timeFormat) : 'Unknown'

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Subject Details</Text>

      <View style={styles.subjectCard}>
        <Text style={styles.subjectName}>{name}</Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>{dateLabel}: </Text>
          {dateStr} at {timeStr}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>Birth Place: </Text>
          {location}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>Timezone: </Text>
          {timezone}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>Latitude: </Text>
          {formatLatitude(lat)}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>Longitude: </Text>
          {formatLongitude(lng)}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>House System: </Text>
          {houseSystem}
        </Text>

        <Text style={styles.subjectDetail}>
          <Text style={styles.subjectLabel}>Perspective: </Text>
          {perspectiveType}
        </Text>

        {subject.lunar_phase && (
          <>
            <Text style={styles.subjectDetail}>
              <Text style={styles.subjectLabel}>Moon Phase: </Text>
              {subject.lunar_phase.moon_phase_name}
            </Text>
            <Text style={styles.subjectDetail}>
              <Text style={styles.subjectLabel}>Moon Phase Day: </Text>
              {subject.lunar_phase.moon_phase}
            </Text>
          </>
        )}
      </View>
    </View>
  )
}
