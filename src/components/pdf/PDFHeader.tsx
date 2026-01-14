import { View, Text, Image } from '@react-pdf/renderer'
import { pdfStyles as styles } from './styles'

interface PDFHeaderProps {
  /** Type of branding to display */
  brandingType: 'default' | 'text' | 'logo'
  /** Base64 encoded logo image */
  logoData?: string | null
  /** Custom branding text */
  brandingText?: string
  /** Report title (e.g., "Natal Chart") */
  reportTitle: string
  /** Optional subtitle */
  subtitle?: string
}

/**
 * PDF Header Component
 *
 * Displays branding (logo, custom text, or default) and report title.
 * AstrologerStudio branding uses Times-Roman serif font for professional look.
 */
export function PDFHeader({ brandingType, logoData, brandingText, reportTitle, subtitle }: PDFHeaderProps) {
  const renderBranding = () => {
    switch (brandingType) {
      case 'logo':
        if (logoData) {
          return <Image src={logoData} style={styles.headerLogo} />
        }
        // Fallback to default if no logo
        return <Text style={styles.headerBrandingText}>AstrologerStudio</Text>

      case 'text':
        return <Text style={styles.headerBrandingText}>{brandingText || 'My Astrology Practice'}</Text>

      case 'default':
      default:
        // AstrologerStudio with Times-Roman serif font
        return <Text style={styles.headerBrandingText}>AstrologerStudio</Text>
    }
  }

  return (
    <View style={styles.header}>
      <View>{renderBranding()}</View>
      <View>
        <Text style={styles.headerTitle}>{reportTitle}</Text>
        {subtitle && <Text style={[styles.footerText, styles.textRight]}>{subtitle}</Text>}
      </View>
    </View>
  )
}
