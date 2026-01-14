import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import type { EnrichedSubjectModel, Point } from '@/types/astrology'

interface PDFHousesTableProps {
  subject: EnrichedSubjectModel
  title?: string
}

// House keys in order
const HOUSE_KEYS = [
  'first_house',
  'second_house',
  'third_house',
  'fourth_house',
  'fifth_house',
  'sixth_house',
  'seventh_house',
  'eighth_house',
  'ninth_house',
  'tenth_house',
  'eleventh_house',
  'twelfth_house',
] as const

// House labels with traditional naming
const HOUSE_LABELS: Record<string, string> = {
  first_house: 'I (Ascendant)',
  second_house: 'II',
  third_house: 'III',
  fourth_house: 'IV (IC)',
  fifth_house: 'V',
  sixth_house: 'VI',
  seventh_house: 'VII (Descendant)',
  eighth_house: 'VIII',
  ninth_house: 'IX',
  tenth_house: 'X (MC)',
  eleventh_house: 'XI',
  twelfth_house: 'XII',
}

/**
 * Convert decimal degrees to degrees-minutes-seconds format
 */
function decimalToDMS(decimal: number): string {
  const degrees = Math.floor(decimal)
  const decimalMinutes = (decimal - degrees) * 60
  const minutes = Math.floor(decimalMinutes)
  const seconds = Math.round((decimalMinutes - minutes) * 60)
  return `${degrees}° ${minutes}' ${seconds}"`
}

/**
 * PDF Houses Table
 *
 * Displays all house cusps with their positions and signs.
 */
export function PDFHousesTable({ subject, title = 'House Cusps' }: PDFHousesTableProps) {
  const houses: Array<{ key: string; label: string; house: Point }> = []

  HOUSE_KEYS.forEach((houseKey) => {
    const house = (subject as unknown as Record<string, unknown>)[houseKey] as Point | undefined
    if (house && typeof house === 'object' && 'position' in house) {
      houses.push({
        key: houseKey,
        label: HOUSE_LABELS[houseKey] || houseKey,
        house,
      })
    }
  })

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '40%' }]}>House</Text>
          <Text style={[styles.tableHeaderCell, { width: '60%' }]}>Position</Text>
        </View>

        {/* Table Body */}
        {houses.map(({ key, label, house }, index) => (
          <View key={key} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternate : {}]}>
            <Text style={[styles.tableCell, { width: '40%' }, styles.bold]}>{label}</Text>
            <Text style={[styles.tableCell, { width: '60%' }]}>
              {decimalToDMS(house.position)} {house.sign}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
