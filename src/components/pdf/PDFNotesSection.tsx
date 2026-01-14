import { View, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'

interface PDFNotesSectionProps {
  /** Notes or interpretation text */
  notes: string
  title?: string
}

/**
 * PDF Notes Section Component
 *
 * Displays interpretation notes or user notes in a styled container.
 */
export function PDFNotesSection({ notes, title = 'Interpretation' }: PDFNotesSectionProps) {
  if (!notes || notes.trim().length === 0) {
    return null
  }

  // Split notes into paragraphs for better formatting
  const paragraphs = notes.split(/\n\n+/).filter((p) => p.trim().length > 0)

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeader}>{title}</Text>

      <View style={styles.notesContainer}>
        {paragraphs.map((paragraph, index) => (
          <Text key={index} style={[styles.notesText, index > 0 ? { marginTop: 8 } : {}]}>
            {paragraph.trim()}
          </Text>
        ))}
      </View>
    </View>
  )
}
