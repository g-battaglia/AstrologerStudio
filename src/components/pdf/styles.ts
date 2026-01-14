import { StyleSheet } from '@react-pdf/renderer'

// Register fonts - using built-in fonts for compatibility
// Helvetica (sans-serif) and Times-Roman (serif) are built-in

/**
 * Print-optimized color palette
 * CMYK-safe colors for professional print quality
 */
export const colors = {
  text: {
    primary: '#1a1a1a',
    secondary: '#4a4a4a',
    muted: '#666666',
    light: '#888888',
  },
  accent: {
    primary: '#2c3e50',
    secondary: '#34495e',
  },
  border: {
    light: '#e0e0e0',
    medium: '#cccccc',
    dark: '#999999',
  },
  background: {
    white: '#ffffff',
    light: '#f8f9fa',
    muted: '#f0f0f0',
  },
} as const

/**
 * Typography scale for print (in points)
 */
export const typography = {
  title: 18,
  sectionHeader: 14,
  subsectionHeader: 12,
  tableHeader: 10,
  body: 10,
  tableData: 9,
  small: 8,
  footer: 8,
} as const

/**
 * Spacing scale (in points)
 */
export const spacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  section: 20,
} as const

/**
 * Page dimensions for A4
 */
export const page = {
  width: 595.28, // A4 width in points
  height: 841.89, // A4 height in points
  margin: {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
  },
} as const

/**
 * Shared PDF styles following traditional print design principles
 */
export const pdfStyles = StyleSheet.create({
  // Page styles
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background.white,
    paddingTop: page.margin.top,
    paddingBottom: page.margin.bottom,
    paddingLeft: page.margin.left,
    paddingRight: page.margin.right,
    fontFamily: 'Helvetica',
    fontSize: typography.body,
    color: colors.text.primary,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    borderBottomStyle: 'solid',
  },
  headerLogo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  headerBrandingText: {
    fontFamily: 'Times-Roman',
    fontSize: typography.subsectionHeader,
    color: colors.accent.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontFamily: 'Times-Roman',
    fontSize: typography.sectionHeader,
    color: colors.accent.primary,
    textAlign: 'right',
  },

  // Section styles
  section: {
    marginBottom: spacing.section,
  },
  sectionHeader: {
    fontFamily: 'Times-Roman',
    fontSize: typography.sectionHeader,
    fontWeight: 'bold',
    color: colors.accent.primary,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
    borderBottomStyle: 'solid',
  },
  subsectionHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.subsectionHeader,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  // Generic card styles (for dual subjects, etc.)
  card: {
    backgroundColor: colors.background.light,
    padding: spacing.lg,
    borderRadius: 4,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.subsectionHeader,
    color: colors.accent.primary,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.sectionHeader,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.body,
    color: colors.text.primary,
    width: 80,
  },
  detailValue: {
    fontSize: typography.body,
    color: colors.text.secondary,
    flex: 1,
  },

  // Subject details card (legacy)
  subjectCard: {
    backgroundColor: colors.background.light,
    padding: spacing.lg,
    borderRadius: 4,
    marginBottom: spacing.lg,
  },
  subjectName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.sectionHeader,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subjectDetail: {
    fontSize: typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  subjectLabel: {
    fontFamily: 'Helvetica-Bold',
    color: colors.text.primary,
  },

  // Chart wheel container
  chartWheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  chartWheelImage: {
    width: 450,
    height: 450,
    objectFit: 'contain',
  },

  // Table styles
  table: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    borderBottomStyle: 'solid',
    alignItems: 'center',
    minHeight: 24,
  },
  tableRowAlternate: {
    backgroundColor: colors.background.light,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.accent.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent.secondary,
    borderBottomStyle: 'solid',
    minHeight: 28,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: typography.tableHeader,
    color: colors.background.white,
    padding: spacing.sm,
  },
  tableCell: {
    fontSize: typography.tableData,
    color: colors.text.primary,
    padding: spacing.sm,
  },
  tableCellEmoji: {
    fontSize: typography.tableData + 2,
    textAlign: 'center',
  },

  // Column widths for planetary table
  colPlanet: { width: '30%' },
  colEmoji: { width: '8%', textAlign: 'center' },
  colPosition: { width: '25%' },
  colSign: { width: '12%', textAlign: 'center' },
  colHouse: { width: '10%', textAlign: 'center' },
  colRetro: { width: '15%', textAlign: 'center' },

  // Column widths for houses table
  colHouseName: { width: '35%' },
  colHouseEmoji: { width: '10%', textAlign: 'center' },
  colHousePosition: { width: '55%' },

  // Column widths for aspects table
  colAspectPoints: { width: '45%' },
  colAspectType: { width: '15%', textAlign: 'center' },
  colAspectOrb: { width: '20%', textAlign: 'center' },
  colAspectMovement: { width: '20%', textAlign: 'center' },

  // Notes section
  notesContainer: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.background.light,
    borderRadius: 4,
  },
  notesText: {
    fontSize: typography.body,
    lineHeight: 1.6,
    color: colors.text.secondary,
    textAlign: 'justify',
  },

  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 30,
    left: page.margin.left,
    right: page.margin.right,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    borderTopStyle: 'solid',
  },
  footerText: {
    fontSize: typography.footer,
    color: colors.text.muted,
  },
  pageNumber: {
    fontSize: typography.footer,
    color: colors.text.muted,
  },

  // Utility styles
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  italic: {
    fontFamily: 'Helvetica-Oblique',
  },
  muted: {
    color: colors.text.muted,
  },
})

/**
 * Helper to get alternating row style
 */
export const getRowStyle = (index: number) => [pdfStyles.tableRow, index % 2 === 1 ? pdfStyles.tableRowAlternate : {}]
