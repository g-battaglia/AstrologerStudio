import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'

interface ScoreBreakdownItem {
  rule: string
  description: string
  points: number
  details: string
}

interface PDFRelationshipScoreProps {
  /** Score value */
  scoreValue: number
  /** Description of the score */
  scoreDescription?: string
  /** Additional notes */
  notes?: string
  /** Score breakdown from API */
  scoreBreakdown?: ScoreBreakdownItem[]
}

const MAX_SCORE = 44

/**
 * PDF Relationship Score Component
 *
 * Displays synastry relationship score with:
 * - Score as X/44 format
 * - Professional Scoring Rules description
 * - Score Breakdown table (from API)
 */
export function PDFRelationshipScore({
  scoreValue,
  scoreDescription,
  notes,
  scoreBreakdown,
}: PDFRelationshipScoreProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>Relationship Compatibility</Text>

      {/* Score Card */}
      <View style={[styles.card, { alignItems: 'center', padding: 20 }]}>
        {/* Score Circle */}
        <View
          style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: '#22c55e',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
            {Math.round(scoreValue)}/{MAX_SCORE}
          </Text>
        </View>

        {scoreDescription && (
          <Text style={[styles.cardTitle, { textAlign: 'center', marginTop: 4 }]}>{scoreDescription}</Text>
        )}
      </View>

      {/* Scoring Rules Text */}
      <View style={[styles.card, { marginTop: 12, padding: 12 }]}>
        <Text style={[styles.cardTitle, { marginBottom: 8, fontSize: 10 }]}>How the score is calculated</Text>

        <Text style={{ fontSize: 8, color: '#525252', lineHeight: 1.4, textAlign: 'justify' }}>
          This compatibility analysis evaluates fundamental planetary interactions, prioritizing Sun, Moon, and
          Ascendant aspects as emotional foundations. Significant weight is given to Sun-Moon conjunctions and "Signs of
          Destiny" (shared Sun sign modality) to identify profound connections, while Venus-Mars aspects assess
          attraction and energetic alignment.
        </Text>
      </View>

      {/* Score Breakdown Table */}
      {scoreBreakdown && scoreBreakdown.length > 0 && (
        <View style={[styles.card, { marginTop: 12, padding: 0 }]}>
          <View style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f9fafb' }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' }}>Score Breakdown</Text>
          </View>
          {scoreBreakdown.map((item, index) => (
            <View
              key={index}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderBottomWidth: index === scoreBreakdown.length - 1 ? 0 : 1,
                borderBottomColor: '#f3f4f6',
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 9, color: '#374151', fontFamily: 'Helvetica-Bold' }}>{item.description}</Text>
                {item.details && <Text style={{ fontSize: 7, color: '#6b7280', marginTop: 2 }}>{item.details}</Text>}
              </View>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#22c55e' }}>+{item.points}</Text>
            </View>
          ))}
        </View>
      )}

      {notes && (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.muted, { fontSize: 8 }]}>{notes}</Text>
        </View>
      )}
    </View>
  )
}
