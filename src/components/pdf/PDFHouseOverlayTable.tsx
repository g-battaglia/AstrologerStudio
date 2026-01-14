import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import type { PointInHouseModel } from '@/types/astrology'

interface PDFHouseOverlayTableProps {
  /** Points projected into houses */
  points: PointInHouseModel[]
  /** Title for the section */
  title: string
  /** Description of what this shows */
  description?: string
  /** Maximum points to display */
  maxPoints?: number
}

/**
 * Format house name for display
 */
function formatHouseName(houseName: string): string {
  return houseName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * PDF House Overlay Table
 *
 * Displays how one subject's planets fall in another subject's houses.
 * Used for Transit, Synastry, and Return charts.
 */
export function PDFHouseOverlayTable({ points, title, description, maxPoints = 30 }: PDFHouseOverlayTableProps) {
  // Sort by house number
  const sortedPoints = [...points]
    .sort((a, b) => a.projected_house_number - b.projected_house_number)
    .slice(0, maxPoints)

  if (sortedPoints.length === 0) {
    return null
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>
      {description && <Text style={[styles.muted, { marginBottom: 8 }]}>{description}</Text>}

      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Planet</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Sign</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'center' }]}>Degree</Text>
          <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Projected House</Text>
        </View>

        {/* Table Body */}
        {sortedPoints.map((point, index) => (
          <View
            key={`${point.point_name}-${point.projected_house_number}-${index}`}
            style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternate : {}]}
          >
            <Text style={[styles.tableCell, { width: '30%' }]}>{formatPlanetName(point.point_name)}</Text>
            <Text style={[styles.tableCell, { width: '20%' }]}>{point.point_sign}</Text>
            <Text style={[styles.tableCell, { width: '15%', textAlign: 'center' }]}>
              {Math.floor(point.point_degree)}°
            </Text>
            <Text style={[styles.tableCell, { width: '35%' }]}>
              {formatHouseName(point.projected_house_name)} ({point.projected_house_number})
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
