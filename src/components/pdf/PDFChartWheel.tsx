import { View, Image, Text } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'

interface PDFChartWheelProps {
  /** Base64 encoded chart wheel image (PNG/JPEG) */
  imageData: string | null
  /** Caption text */
  caption?: string
}

/**
 * PDF Chart Wheel Component
 *
 * Displays the astrological chart wheel as an embedded image.
 * Returns null if no image data is provided (to avoid empty space).
 */
export function PDFChartWheel({ imageData, caption = 'Birth Chart' }: PDFChartWheelProps) {
  // Don't render anything if no image to avoid empty space
  if (!imageData) {
    return null
  }

  return (
    <View style={styles.section}>
      <View style={styles.chartWheelContainer}>
        <Image src={imageData} style={styles.chartWheelImage} />
        {caption && <Text style={[styles.footerText, { marginTop: 8 }]}>{caption}</Text>}
      </View>
    </View>
  )
}
