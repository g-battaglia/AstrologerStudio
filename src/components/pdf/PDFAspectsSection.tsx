import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'
import { isMajorAspect } from '@/lib/astrology/aspects'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import type { Aspect } from '@/types/astrology'

interface PDFAspectsSectionProps {
  aspects: Aspect[]
  title?: string
  /** Maximum number of aspects to display */
  maxAspects?: number
}

/**
 * Format orb value to degrees and minutes
 */
function formatOrb(orbit: number): string {
  const degrees = Math.floor(Math.abs(orbit))
  const minutes = Math.round((Math.abs(orbit) - degrees) * 60)
  return `${degrees}° ${minutes}'`
}

/**
 * Format aspect name for display
 */
function formatAspectName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Categorize aspects by type
 */
function categorizeAspects(aspects: Aspect[]) {
  return {
    majorAspects: aspects.filter((a) => isMajorAspect(a.aspect)),
    minorAspects: aspects.filter((a) => !isMajorAspect(a.aspect)),
  }
}

/**
 * Sort aspects by importance (tighter orbs first)
 */
function sortAspects(aspects: Aspect[]): Aspect[] {
  return [...aspects].sort((a, b) => Math.abs(a.orbit) - Math.abs(b.orbit))
}

/**
 * PDF Aspects Section
 *
 * Displays all aspects in a formatted table.
 */
export function PDFAspectsSection({ aspects, title = 'Aspects', maxAspects = 50 }: PDFAspectsSectionProps) {
  const { majorAspects, minorAspects } = categorizeAspects(aspects)
  const sortedMajor = sortAspects(majorAspects)
  const sortedMinor = sortAspects(minorAspects)

  // Limit total aspects
  const displayMajor = sortedMajor.slice(0, maxAspects)
  const remainingSlots = Math.max(0, maxAspects - displayMajor.length)
  const displayMinor = sortedMinor.slice(0, remainingSlots)

  const renderAspectRow = (aspect: Aspect, index: number) => {
    const p1Name = formatPlanetName(aspect.p1_name)
    const p2Name = formatPlanetName(aspect.p2_name)
    const aspectName = formatAspectName(aspect.aspect)

    return (
      <View
        key={`${aspect.p1_name}-${aspect.p2_name}-${aspect.aspect}-${index}`}
        style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlternate : {}]}
      >
        <Text style={[styles.tableCell, { width: '55%' }]}>
          {p1Name} — {p2Name}
        </Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>{aspectName}</Text>
        <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' }]}>{formatOrb(aspect.orbit)}</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>

      {/* Major Aspects */}
      {displayMajor.length > 0 && (
        <View>
          <Text style={styles.subsectionHeader}>Major Aspects ({displayMajor.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Aspect</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Orb</Text>
            </View>
            {displayMajor.map(renderAspectRow)}
          </View>
        </View>
      )}

      {/* Minor Aspects */}
      {displayMinor.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.subsectionHeader}>Minor Aspects ({displayMinor.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '55%' }]}>Aspect</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' }]}>Orb</Text>
            </View>
            {displayMinor.map(renderAspectRow)}
          </View>
        </View>
      )}

      {displayMajor.length === 0 && displayMinor.length === 0 && (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 12 }]}>No aspects found</Text>
      )}
    </View>
  )
}
