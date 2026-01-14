import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import type { EnrichedSubjectModel, Point } from '@/types/astrology'

interface PDFPlanetaryTableProps {
  subject: EnrichedSubjectModel
  title?: string
}

// Map house names to numbers
const HOUSE_NAME_TO_NUMBER: Record<string, number> = {
  first_house: 1,
  second_house: 2,
  third_house: 3,
  fourth_house: 4,
  fifth_house: 5,
  sixth_house: 6,
  seventh_house: 7,
  eighth_house: 8,
  ninth_house: 9,
  tenth_house: 10,
  eleventh_house: 11,
  twelfth_house: 12,
}

/**
 * Convert decimal degrees to degrees-minutes format
 */
function decimalToDM(decimal: number): string {
  const degrees = Math.floor(decimal)
  const minutes = Math.round((decimal - degrees) * 60)
  return `${degrees}° ${minutes}'`
}

/**
 * Get house number from house name
 */
function getHouseNumber(houseName: string | null | undefined): string {
  if (!houseName) return '-'
  const normalized = houseName.toLowerCase().replace(/ /g, '_')
  return HOUSE_NAME_TO_NUMBER[normalized]?.toString() || '-'
}

/**
 * PDF Planetary Positions Table
 *
 * Displays all celestial points with their positions, signs, and houses.
 * Uses the complete ALL_CELESTIAL_POINTS list from celestial-points.ts.
 */
export function PDFPlanetaryTable({ subject, title = 'Planetary Positions' }: PDFPlanetaryTableProps) {
  // Extract points from subject using ALL_CELESTIAL_POINTS
  const points: Array<{ key: string; name: string; point: Point }> = []

  ALL_CELESTIAL_POINTS.forEach((pointName) => {
    // Convert point name to property key (lowercase with underscores)
    const propertyKey = pointName.toLowerCase().replace(/ /g, '_')
    const point = (subject as unknown as Record<string, unknown>)[propertyKey] as Point | undefined

    if (point && typeof point === 'object' && 'position' in point) {
      points.push({
        key: propertyKey,
        name: formatPlanetName(pointName),
        point,
      })
    }
  })

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Planet</Text>
          <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Position</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Sign</Text>
          <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'center' }]}>House</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Motion</Text>
        </View>

        {/* Table Body */}
        {points.map(({ key, name, point }, index) => (
          <View key={key} style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternate : {}]}>
            <Text style={[styles.tableCell, { width: '35%' }]}>{name}</Text>
            <Text style={[styles.tableCell, { width: '25%' }]}>{decimalToDM(point.position)}</Text>
            <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>{point.sign}</Text>
            <Text style={[styles.tableCell, { width: '10%', textAlign: 'center' }]}>{getHouseNumber(point.house)}</Text>
            <Text
              style={[
                styles.tableCell,
                { width: '15%', textAlign: 'center' },
                point.retrograde ? styles.bold : styles.muted,
              ]}
            >
              {point.retrograde ? 'R' : 'D'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
