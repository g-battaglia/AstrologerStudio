'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Sparkles, Save, BarChart3, Table, PieChart, Lock, Share2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DateTimeLocationSelector } from '@/components/ui/DateTimeLocationSelector'
import { PublicBirthChartForm } from './PublicBirthChartForm'
import type { LocationFormValues } from '@/components/SubjectLocationFields'
import { useTheme } from '@/components/ThemeProvider'
import { getPublicNatalChart, getPublicNowChart, type PublicBirthData } from '@/actions/public-astrology'
import { NatalChart } from '@/components/charts/NatalChart'
import { ChartErrorState } from '@/components/ChartErrorState'
import { ExportPDFDialog } from '@/components/pdf'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { Footer } from '@/components/landing/Footer'
import { useDateFormat, useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'
import { toast } from 'sonner'

/**
 * Encode birth data to base64 for shareable URL
 */
function encodeChartData(data: PublicBirthData): string {
  return btoa(JSON.stringify(data))
}

/**
 * Decode birth data from base64 URL parameter
 */
function decodeChartData(encoded: string): PublicBirthData | null {
  try {
    return JSON.parse(atob(encoded))
  } catch {
    return null
  }
}

/**
 * Custom TabsList for public users - includes highlighted PRO badge on AI tab with tooltip
 */
function PublicChartTabsList({ hasData = false }: { hasData?: boolean }) {
  return (
    <TooltipProvider>
      <TabsList>
        <TabsTrigger value="chart" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Chart</span>
        </TabsTrigger>
        <TabsTrigger value="aspects" className="gap-2">
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Aspects</span>
        </TabsTrigger>
        {hasData && (
          <TabsTrigger value="data" className="gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Data</span>
          </TabsTrigger>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <TabsTrigger value="interpretation" className="gap-2 relative">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI</span>
              <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 animate-pulse">
                PRO
              </Badge>
            </TabsTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
            <p className="font-medium">🔒 Subscribe to unlock AI Interpretation</p>
          </TooltipContent>
        </Tooltip>
      </TabsList>
    </TooltipProvider>
  )
}

export function TryBirthChartView() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [override, setOverride] = useState<{ dateTime: string; location: LocationFormValues } | null>(null)
  const [_initialData, setInitialData] = useState<PublicBirthData | null>(null)
  const [showUnlockPopup, setShowUnlockPopup] = useState(true)

  // Mode detection: form is default, mode=now shows Now Chart directly
  const mode = searchParams.get('mode')
  const isNowMode = mode === 'now'
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [chartName, setChartName] = useState('Demo Chart')

  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()

  // Show form dialog on mount if NOT in now mode and no chart data yet
  useEffect(() => {
    if (!isNowMode && !override && !searchParams.get('chart')) {
      setShowFormDialog(true)
    }
  }, [isNowMode, override, searchParams])

  // Load initial data from URL on mount (only once - use ref to prevent re-parsing)
  const hasLoadedFromUrl = useRef(false)
  useEffect(() => {
    // Only parse URL once
    if (hasLoadedFromUrl.current) {
      return
    }

    const chartParam = searchParams.get('chart')
    if (chartParam) {
      const decoded = decodeChartData(chartParam)
      if (decoded) {
        hasLoadedFromUrl.current = true
        setInitialData(decoded)
        // Convert to override format
        const dateTime = new Date(decoded.year, decoded.month - 1, decoded.day, decoded.hour, decoded.minute)
        setOverride({
          dateTime: dateTime.toISOString(),
          location: {
            city: decoded.city,
            nation: decoded.nation,
            latitude: decoded.latitude,
            longitude: decoded.longitude,
            timezone: decoded.timezone,
          },
        })
        // Update chart name from decoded data
        if (decoded.name) {
          setChartName(decoded.name)
        }
      }
    }
  }, [searchParams])

  // Query for chart generation - starts with Now Chart or shared data
  // Serialize override to primitive values for stable queryKey
  const overrideKey = override
    ? `${override.dateTime}-${override.location.city}-${override.location.latitude}-${override.location.longitude}`
    : null

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['public-try-chart', chartTheme, overrideKey, chartName],
    queryFn: async () => {
      if (override) {
        // User specified custom data via DateTimeLocationSelector or form
        const dateTime = new Date(override.dateTime)
        const birthData: PublicBirthData = {
          name: chartName,
          year: dateTime.getFullYear(),
          month: dateTime.getMonth() + 1,
          day: dateTime.getDate(),
          hour: dateTime.getHours(),
          minute: dateTime.getMinutes(),
          city: override.location.city || '',
          nation: override.location.nation || '',
          latitude: override.location.latitude || 0,
          longitude: override.location.longitude || 0,
          timezone: override.location.timezone || 'UTC',
        }
        return getPublicNatalChart(birthData, chartTheme)
      }
      // Default: show Now Chart
      return getPublicNowChart(chartTheme)
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - chart data doesn't change
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })

  // Track rate limits
  useEffect(() => {
    if (isError && error instanceof Error && error.message.includes('Too many requests')) {
      if (typeof window !== 'undefined' && window?.umami) {
        window?.umami?.track('rate-limit-exceeded-public')
      }
      toast.error('Rate limit exceeded', { description: 'Please try again in a minute.' })
    }
  }, [isError, error])

  // Extract current values for the DateTimeLocationSelector
  const currentSubject = data?.chart_data?.subject
  const currentDateTime = useMemo(() => {
    if (override) return override.dateTime
    if (currentSubject?.iso_formatted_local_datetime) return currentSubject.iso_formatted_local_datetime
    return new Date().toISOString()
  }, [override, currentSubject])

  const currentLocation: LocationFormValues = useMemo(() => {
    if (override) return override.location
    return {
      city: currentSubject?.city || '',
      nation: currentSubject?.nation || '',
      latitude: currentSubject?.latitude ?? 0,
      longitude: currentSubject?.longitude ?? 0,
      timezone: currentSubject?.timezone || 'UTC',
    }
  }, [override, currentSubject])

  // Handle calculate from DateTimeLocationSelector
  const handleCalculate = useCallback((newOverride: { dateTime: string; location: LocationFormValues }) => {
    setOverride(newOverride)
  }, [])

  // Share button handler
  const handleShare = useCallback(async () => {
    if (!override) {
      toast.info('Calculate a birth chart first to share')
      return
    }

    const dateTime = new Date(override.dateTime)
    const birthData: PublicBirthData = {
      name: chartName,
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1,
      day: dateTime.getDate(),
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      city: override.location.city || '',
      nation: override.location.nation || '',
      latitude: override.location.latitude || 0,
      longitude: override.location.longitude || 0,
      timezone: override.location.timezone || 'UTC',
    }

    const encoded = encodeChartData(birthData)
    const shareUrl = `${window.location.origin}/share/birthchart?chart=${encoded}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Link copied to clipboard!', { description: 'Share this link to show this chart' })
    } catch {
      toast.error('Failed to copy link')
    }
  }, [override, chartName])

  // Generate save URL with encoded chart data
  const getSaveUrl = useMemo(() => {
    if (!override) {
      // If no custom chart data, link to register without data
      return '/register?redirect=/subjects'
    }

    const dateTime = new Date(override.dateTime)
    const birthData: PublicBirthData = {
      name: chartName,
      year: dateTime.getFullYear(),
      month: dateTime.getMonth() + 1,
      day: dateTime.getDate(),
      hour: dateTime.getHours(),
      minute: dateTime.getMinutes(),
      city: override.location.city || '',
      nation: override.location.nation || '',
      latitude: override.location.latitude || 0,
      longitude: override.location.longitude || 0,
      timezone: override.location.timezone || 'UTC',
    }

    const encoded = encodeChartData(birthData)
    // Redirect to register, then after auth to save-subject with data
    return `/register?redirect=${encodeURIComponent(`/save-subject?data=${encoded}`)}`
  }, [override, chartName])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <LandingNavbar />
        <main className="flex-1 pt-20 pb-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="space-y-8 p-0 md:p-2">
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-[500px] w-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <LandingNavbar />
        <main className="flex-1 pt-20 pb-12">
          <div className="container mx-auto px-4 max-w-7xl">
            <ChartErrorState title="Error loading chart" error={error} onRetry={() => refetch()} />
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LandingNavbar />

      <main className="flex-1 pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header - Center aligned */}
          <div className="text-center mb-6">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Free Tool
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Free Birth Chart Calculator</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Enter your birth details below to generate your personalized natal chart.
            </p>
          </div>

          {/* Chart View - Same structure as NowChartView */}
          <Tabs defaultValue="chart" className="space-y-3 p-0 md:p-2 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{chartName}</h2>
                <p className="text-muted-foreground">
                  {formatDisplayDate(currentDateTime, dateFormat)} {formatDisplayTime(currentDateTime, timeFormat)} •{' '}
                  {currentLocation.city || 'Unknown'}, {currentLocation.nation || ''}
                </p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <PublicChartTabsList hasData={true} />

                <div className="flex items-center gap-2 ml-auto">
                  {/* Share Button */}
                  <Button variant="outline" size="icon" onClick={handleShare} title="Copy shareable link">
                    <Share2 className="h-4 w-4" />
                  </Button>

                  {/* PDF Export - Free! */}
                  {data && (
                    <ExportPDFDialog
                      chartData={data.chart_data}
                      aspects={data.chart_data.aspects}
                      chartWheelHtml={data.chart_wheel}
                      variant="outline"
                      size="icon"
                    />
                  )}

                  {/* Save Button */}
                  <Link href={getSaveUrl}>
                    <Button variant="outline" className="whitespace-nowrap">
                      <Save className="h-4 w-4" />
                      <span className="hidden sm:inline">Save</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* DateTimeLocationSelector - same as in NowChartView */}
            <DateTimeLocationSelector
              defaultDateTime={currentDateTime}
              defaultLocation={currentLocation}
              onCalculate={handleCalculate}
              submitLabel="Calculate Chart"
            />

            {/* Chart Tab Content */}
            <TabsContent value="chart" className="mt-0">
              <div className={isFetching ? 'opacity-50 transition-opacity duration-200' : ''}>
                <NatalChart data={data} subjectId="public-try-chart" />
              </div>
            </TabsContent>

            {/* Aspects Tab Content - reuse NatalChart but in aspects view */}
            <TabsContent value="aspects" className="mt-0">
              <div className={isFetching ? 'opacity-50 transition-opacity duration-200' : ''}>
                <NatalChart data={data} subjectId="public-try-chart" />
              </div>
            </TabsContent>

            {/* Data Tab Content */}
            <TabsContent value="data" className="mt-0">
              <div className={isFetching ? 'opacity-50 transition-opacity duration-200' : ''}>
                <NatalChart data={data} subjectId="public-try-chart" />
              </div>
            </TabsContent>

            {/* AI Interpretation Tab Content - Preview with Unlock Overlay */}
            <TabsContent value="interpretation" className="mt-0">
              <div className="relative">
                {/* Blurred preview behind the overlay */}
                <div className="filter blur-sm opacity-50 pointer-events-none">
                  <div className="space-y-4 p-4">
                    <Card className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-muted rounded" />
                          <div className="h-3 w-full bg-muted rounded" />
                          <div className="h-3 w-5/6 bg-muted rounded" />
                          <div className="h-3 w-4/5 bg-muted rounded" />
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="space-y-3">
                        <div className="h-5 w-1/3 bg-muted rounded" />
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-3/4 bg-muted rounded" />
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="space-y-3">
                        <div className="h-5 w-1/4 bg-muted rounded" />
                        <div className="h-3 w-full bg-muted rounded" />
                        <div className="h-3 w-5/6 bg-muted rounded" />
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Unlock Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <Card className="max-w-md mx-4 bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                    <CardContent className="p-8 text-center">
                      <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">Unlock AI Interpretation</h3>
                      <p className="text-muted-foreground mb-6">
                        Get personalized AI-powered insights about your birth chart, including planetary aspects, house
                        placements, and life themes.
                      </p>
                      <div className="flex flex-col gap-3">
                        <Link href="/register?redirect=/share/birthchart&action=ai">
                          <Button size="lg" className="gap-2 w-full">
                            <Sparkles className="h-4 w-4" />
                            Create Free Account
                          </Button>
                        </Link>
                        <p className="text-xs text-muted-foreground">Free trial includes AI interpretations</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />

      {/* Dismissible Unlock Popup - Bottom Right */}
      {showUnlockPopup && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
          <Card className="bg-background/80 backdrop-blur-md border-primary/20 shadow-lg w-80 relative overflow-hidden supports-[backdrop-filter]:bg-background/60">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground z-10"
              onClick={() => setShowUnlockPopup(false)}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </Button>

            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center shrink-0 mt-1">
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none mb-1">Unlock Full Access</h3>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Get AI interpretations, save unlimited charts, and explore advanced reports.
                  </p>
                </div>
              </div>
              <Link href="/register" className="block">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                >
                  Start Free Trial
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Form-first Mode Dialog */}
      <PublicBirthChartForm
        open={showFormDialog}
        onOpenChange={setShowFormDialog}
        onSubmit={(data) => {
          // Update chart name from form
          setChartName(data.name || 'Birth Chart')

          // Create override with form data
          const dateTime = new Date(data.year, data.month - 1, data.day, data.hour, data.minute)
          const newOverride = {
            dateTime: dateTime.toISOString(),
            location: {
              city: data.city,
              nation: data.nation,
              latitude: data.latitude,
              longitude: data.longitude,
              timezone: data.timezone,
            },
          }
          setOverride(newOverride)

          // Update URL with base64 encoded data
          const birthData: PublicBirthData = {
            name: data.name,
            year: data.year,
            month: data.month,
            day: data.day,
            hour: data.hour,
            minute: data.minute,
            city: data.city,
            nation: data.nation,
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
          }
          const encoded = encodeChartData(birthData)
          router.replace(`/share/birthchart?chart=${encoded}`, { scroll: false })
        }}
      />
    </div>
  )
}
