/**
 * NOTE: DODO PAYMENTS - This page contains billing-related logic (SubscriptionStatus tab)
 */
'use client'

import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AccountSettingsPanel } from '@/components/settings/AccountSettingsPanel'
import {
  AppearanceSection,
  CalculationSection,
  PointsAspectsSection,
  DEFAULT_PREFERENCES,
} from '@/components/settings/ChartSettingsPanel'
import { AISettingsPanel } from '@/components/settings/AISettingsPanel'
import { PDFBrandingSettings } from '@/components/settings/PDFBrandingSettings'
import { getChartPreferences, updateChartPreferences, type ChartPreferencesData } from '@/actions/preferences'
import { toast } from 'sonner'
import { Loader2, Save, RotateCcw, Palette, Calculator, Star, Sparkles, User } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { clientLogger } from '@/lib/logging/client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<ChartPreferencesData>(DEFAULT_PREFERENCES)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTab = searchParams.get('tab') || 'appearance'

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const queryClient = useQueryClient()

  useEffect(() => {
    loadPreferences()
  }, [])

  async function loadPreferences() {
    try {
      const data = await getChartPreferences()
      if (data) {
        setPrefs({
          theme: data.theme ?? DEFAULT_PREFERENCES.theme,
          date_format: data.date_format ?? DEFAULT_PREFERENCES.date_format,
          time_format: data.time_format ?? DEFAULT_PREFERENCES.time_format,
          show_aspect_icons: data.show_aspect_icons ?? DEFAULT_PREFERENCES.show_aspect_icons,

          show_degree_indicators: data.show_degree_indicators ?? DEFAULT_PREFERENCES.show_degree_indicators,
          distribution_method: data.distribution_method ?? DEFAULT_PREFERENCES.distribution_method,
          active_points: data.active_points || DEFAULT_PREFERENCES.active_points,
          active_aspects: data.active_aspects?.length ? data.active_aspects : DEFAULT_PREFERENCES.active_aspects,
          custom_distribution_weights:
            data.custom_distribution_weights || DEFAULT_PREFERENCES.custom_distribution_weights,

          default_zodiac_system: data.default_zodiac_system ?? DEFAULT_PREFERENCES.default_zodiac_system,
          default_sidereal_mode: data.default_sidereal_mode ?? DEFAULT_PREFERENCES.default_sidereal_mode,
          house_system: data.house_system ?? DEFAULT_PREFERENCES.house_system,
          perspective_type: data.perspective_type ?? DEFAULT_PREFERENCES.perspective_type,
          rulership_mode: data.rulership_mode ?? DEFAULT_PREFERENCES.rulership_mode,
        })
      }
    } catch (error) {
      clientLogger.error('Failed to load preferences:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateChartPreferences(prefs)
      // Invalidate preferences cache so all components get the updated values
      await queryClient.invalidateQueries({ queryKey: ['chartPreferences'] })
      toast.success('Settings saved successfully')
    } catch (error) {
      clientLogger.error('Failed to save preferences:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    // This function is called when the user confirms the reset in the dialog
    setSaving(true)
    try {
      // Reset local state to defaults
      setPrefs(DEFAULT_PREFERENCES)
      // Save immediately as requested
      await updateChartPreferences(DEFAULT_PREFERENCES)
      toast.success('Settings reset to defaults')
    } catch (error) {
      clientLogger.error('Failed to reset preferences:', error)
      toast.error('Failed to reset settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8 h-screen items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto p-0 md:p-2 py-10">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="flex flex-col gap-6 mb-0">
          {/* Header with Title and Global Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={saving}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Defaults
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset all chart configuration settings to their default values. This action cannot be
                      undone and will be saved immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReset}>Continue</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:flex sm:flex-row h-auto">
            <TabsTrigger
              value="appearance"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              <Palette className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger
              value="calculation"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              <Calculator className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">Chart Calculation</span>
            </TabsTrigger>
            <TabsTrigger
              value="points-aspects"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              <Star className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">Points & Aspects</span>
            </TabsTrigger>
            {isAIGloballyEnabled() && (
              <TabsTrigger
                value="ai"
                className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
              >
                <Sparkles className="h-4 w-4 lg:hidden" />
                <span className="hidden lg:inline">AI Interpretation</span>
              </TabsTrigger>
            )}

            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
            >
              <User className="h-4 w-4 lg:hidden" />
              <span className="hidden lg:inline">Account</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="mt-4">
          <TabsContent value="appearance" className="space-y-4">
            <AppearanceSection prefs={prefs} setPrefs={setPrefs} />
            <div id="pdf-branding">
              <PDFBrandingSettings />
            </div>
          </TabsContent>

          <TabsContent value="calculation" className="space-y-4">
            <CalculationSection prefs={prefs} setPrefs={setPrefs} />
          </TabsContent>

          <TabsContent value="points-aspects" className="space-y-4">
            <PointsAspectsSection prefs={prefs} setPrefs={setPrefs} />
          </TabsContent>

          {isAIGloballyEnabled() && (
            <TabsContent value="ai" className="space-y-4">
              <AISettingsPanel />
            </TabsContent>
          )}

          <TabsContent value="account" className="space-y-4">
            <AccountSettingsPanel />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
