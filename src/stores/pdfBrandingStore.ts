import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * PDF Branding Type
 * - 'default': Uses AstrologerStudio branding
 * - 'text': Uses custom text branding
 * - 'logo': Uses uploaded logo image
 */
export type BrandingType = 'default' | 'text' | 'logo'

/**
 * PDF Export Options
 */
export interface PDFExportOptions {
  includeChartWheel: boolean
  includeAspects: boolean
  includeInterpretation: boolean
  includeHouses: boolean
  includePlanets: boolean
  includeRelationshipScore: boolean
}

/**
 * PDF Branding Store State
 */
export interface PDFBrandingState {
  // Branding settings
  brandingType: BrandingType
  logoData: string | null // Base64 encoded image
  brandingText: string
  showFooter: boolean
  footerText: string

  // Export options
  exportOptions: PDFExportOptions

  // Actions
  setBrandingType: (type: BrandingType) => void
  setLogoData: (data: string | null) => void
  setBrandingText: (text: string) => void
  setShowFooter: (show: boolean) => void
  setFooterText: (text: string) => void
  setExportOption: <K extends keyof PDFExportOptions>(key: K, value: PDFExportOptions[K]) => void
  resetToDefaults: () => void
}

const DEFAULT_EXPORT_OPTIONS: PDFExportOptions = {
  includeChartWheel: true,
  includeAspects: true,
  includeInterpretation: true,
  includeHouses: true,
  includePlanets: true,
  includeRelationshipScore: true,
}

const DEFAULT_STATE = {
  brandingType: 'default' as BrandingType,
  logoData: null,
  brandingText: '',
  showFooter: true,
  footerText: '',
  exportOptions: DEFAULT_EXPORT_OPTIONS,
}

/**
 * PDF Branding Store
 *
 * Manages PDF export branding preferences, stored in localStorage.
 *
 * @example
 * ```tsx
 * const { brandingType, setBrandingType, logoData } = usePDFBranding()
 *
 * // Set custom text branding
 * setBrandingType('text')
 * setBrandingText('My Astrology Practice')
 *
 * // Or upload logo
 * setBrandingType('logo')
 * setLogoData(base64EncodedImage)
 * ```
 */
export const usePDFBranding = create<PDFBrandingState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setBrandingType: (type) => set({ brandingType: type }),

      setLogoData: (data) => set({ logoData: data }),

      setBrandingText: (text) => set({ brandingText: text }),

      setShowFooter: (show) => set({ showFooter: show }),

      setFooterText: (text) => set({ footerText: text }),

      setExportOption: (key, value) =>
        set((state) => ({
          exportOptions: { ...state.exportOptions, [key]: value },
        })),

      resetToDefaults: () => set(DEFAULT_STATE),
    }),
    { name: 'pdf-branding' },
  ),
)
