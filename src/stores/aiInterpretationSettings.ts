import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ASTROLOGICAL_SCHOOL_PROMPTS } from '@/lib/ai/prompts'

/**
 * Astrological school types for interpretation
 */
export type AstrologicalSchool = 'modern' | 'traditional' | 'psychological' | 'evolutionary' | 'vedic' | 'custom'

/**
 * Supported output languages
 */
export type InterpretationLanguage =
  | 'it' // Italian
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ko' // Korean
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'nl' // Dutch
  | 'pl' // Polish
  | 'tr' // Turkish
  | 'sv' // Swedish
  | 'no' // Norwegian
  | 'da' // Danish
  | 'fi' // Finnish
  | 'el' // Greek
  | 'cs' // Czech
  | 'ro' // Romanian
  | 'hu' // Hungarian
  | 'th' // Thai
  | 'vi' // Vietnamese
  | 'id' // Indonesian

export const LANGUAGE_NAMES: Record<InterpretationLanguage, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिंदी',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  el: 'Ελληνικά',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
}

/**
 * AI Interpretation Settings Store
 */
export interface AIInterpretationSettings {
  /** Whether AI interpretation is enabled */
  enabled: boolean
  /** Selected astrological school */
  selectedSchool: AstrologicalSchool
  /** Custom prompt text (used when selectedSchool is 'custom') */
  customPrompt: string
  /** Output language for interpretations */
  language: InterpretationLanguage
  /** Whether to include house comparison data in AI context when available */
  include_house_comparison: boolean
  /** Toggle interpretation feature */
  setEnabled: (enabled: boolean) => void
  /** Set selected astrological school */
  setSelectedSchool: (school: AstrologicalSchool) => void
  /** Set custom prompt text */
  setCustomPrompt: (prompt: string) => void
  /** Set output language */
  setLanguage: (language: InterpretationLanguage) => void
  /** Toggle inclusion of house comparison data in AI context */
  setIncludeHouseComparison: (value: boolean) => void
  /** Get the active system prompt based on current settings */
  getActivePrompt: () => string
  /** Reset all settings to defaults */
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS = {
  enabled: true,
  selectedSchool: 'modern' as AstrologicalSchool,
  customPrompt: '',
  language: 'en' as InterpretationLanguage,
  include_house_comparison: true,
}

export const useAIInterpretation = create<AIInterpretationSettings>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setEnabled: (enabled) => set({ enabled }),

      setSelectedSchool: (selectedSchool) => set({ selectedSchool }),

      setCustomPrompt: (customPrompt) => set({ customPrompt }),

      setLanguage: (language) => set({ language }),

      setIncludeHouseComparison: (include_house_comparison) => set({ include_house_comparison }),

      getActivePrompt: () => {
        const state = get()
        if (state.selectedSchool === 'custom') {
          return state.customPrompt || ASTROLOGICAL_SCHOOL_PROMPTS.modern
        }
        return ASTROLOGICAL_SCHOOL_PROMPTS[state.selectedSchool]
      },

      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'ai-interpretation-settings',
    },
  ),
)
