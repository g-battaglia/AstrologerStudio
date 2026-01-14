'use client'

import { ChartResponse, HouseComparison, Aspect } from '@/types/astrology'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { useTheme } from '@/components/ThemeProvider'
import { ChartConfig, ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { HouseComparisonCard } from './HouseComparisonCard'
import { ChartHighlights } from './ChartHighlights'
import { KeyAspectsSection } from './KeyAspectsSection'
import { LunarPhaseCard } from './LunarPhaseCard'
import { CompatibilityScoreCard } from './CompatibilityScoreCard'
import { getRelevantAspects, normalizeChartType } from '@/lib/astrology/chart-highlights'
import { processChartData, getLunarPhaseData, CHART_THEME_COLORS, ChartPoint } from '@/lib/astrology/chart-data'
import { Flame, Sparkles, Globe, Moon } from 'lucide-react'

/**
 * Helper to find which partner house a planet falls into
 * For Primary tab: uses first_points_in_second_houses
 * For Secondary tab: uses second_points_in_first_houses
 */
function findPartnerHouse(
  planetName: string,
  houseComparison: HouseComparison | undefined,
  isPrimary: boolean,
): number | null {
  if (!houseComparison) return null

  const points = isPrimary
    ? houseComparison.first_points_in_second_houses
    : houseComparison.second_points_in_first_houses

  if (!points) return null

  const point = points.find((p) => p.point_name === planetName)
  return point?.projected_house_number ?? null
}

/**
 * Formats house number to ordinal name (e.g., 1 -> "First House", 10 -> "Tenth House")
 */
function formatOrdinalHouse(houseNum: number | null): string {
  if (houseNum === null) return '-'
  const ordinals = [
    'First',
    'Second',
    'Third',
    'Fourth',
    'Fifth',
    'Sixth',
    'Seventh',
    'Eighth',
    'Ninth',
    'Tenth',
    'Eleventh',
    'Twelfth',
  ]
  const name = ordinals[houseNum - 1]
  return name ? `${name} House` : `House ${houseNum}`
}

interface ChartDataViewProps {
  data: ChartResponse
  secondaryData?: ChartResponse
  primaryLabel?: string
  secondaryLabel?: string
  chartType?: string
  /** Optional override for house comparison data (use when data comes from combined chart) */
  houseComparison?: HouseComparison
  /** Optional override for aspects (use for transit charts where aspects come from combined chart) */
  aspects?: Aspect[]
}

/**
 * ChartDataView Component
 *
 * Displays detailed astrological chart data including:
 * - Chart highlights (key aspects, planetary positions)
 * - Lunar phase information
 * - Element and quality distributions (radar charts)
 * - House comparisons (for dual charts)
 * - Planetary positions tables
 *
 * Supports both single charts (Natal) and dual charts (Synastry, Transits, Returns).
 */
export function ChartDataView({
  data,
  secondaryData,
  primaryLabel = 'Primary',
  secondaryLabel = 'Secondary',
  chartType,
  houseComparison: houseComparisonOverride,
  aspects: aspectsOverride,
}: ChartDataViewProps) {
  const { chart_data } = data
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  // Use override if provided, otherwise fall back to chart_data.house_comparison
  const houseComparison = houseComparisonOverride ?? chart_data.house_comparison

  // Use aspects override if provided (for transit charts where aspects come from combined chart)
  // Otherwise use the standard getRelevantAspects logic
  const aspectsToUse =
    aspectsOverride ?? getRelevantAspects(normalizeChartType(chartType ?? ''), chart_data, secondaryData?.chart_data)

  // Process all chart data using utilities
  const processed = processChartData(data, secondaryData, chartType, isDark)

  // Chart configuration for Recharts
  const chartConfig = {
    primary: {
      label: primaryLabel,
      color: CHART_THEME_COLORS.primary,
    },
    ...(secondaryData && {
      secondary: {
        label: secondaryLabel,
        color: CHART_THEME_COLORS.secondary,
      },
    }),
  } satisfies ChartConfig

  /**
   * Custom tooltip component for radar charts.
   *
   * Displays detailed breakdown of points in each category,
   * showing both primary and secondary chart data when available.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="grid min-w-[12rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm shadow-xl">
          <div className="flex w-full flex-col gap-2">
            {/* Primary Subject */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 font-medium border-b pb-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
                <span className="capitalize">{data.subject}</span>
                {secondaryData && (
                  <>
                    <span className="text-muted-foreground">-</span>
                    <span>{primaryLabel}</span>
                  </>
                )}
                <span className="ml-auto font-bold">{Math.round(data.percentage)}%</span>
              </div>
              <div className="flex flex-col gap-0.5 pl-4">
                {data.points.length > 0 ? (
                  data.points.map((p: ChartPoint) => (
                    <div key={p.name} className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span className="w-4 text-center">{p.emoji}</span>
                      <span>{p.name.replace(/_/g, ' ')}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-xs italic">No points</span>
                )}
              </div>
            </div>

            {/* Secondary Subject */}
            {secondaryData && data.secondaryPercentage !== undefined && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 font-medium border-b pb-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-secondary)' }} />
                  <span className="capitalize">{data.subject}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{secondaryLabel}</span>
                  <span className="ml-auto font-bold">{Math.round(data.secondaryPercentage)}%</span>
                </div>
                <div className="flex flex-col gap-0.5 pl-4">
                  {data.secondaryPoints && data.secondaryPoints.length > 0 ? (
                    data.secondaryPoints.map((p: ChartPoint) => (
                      <div key={p.name} className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span className="w-4 text-center">{p.emoji}</span>
                        <span>{p.name.replace(/_/g, ' ')}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-xs italic">No points</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Check if this is a synastry chart with relationship score
  const isSynastry = processed.effectiveChartType === 'synastry' || chartType === 'synastry'
  const hasRelationshipScore = chart_data.relationship_score && chart_data.relationship_score.score_value !== undefined

  return (
    <div className="space-y-8">
      {/* Compatibility Score Card - Only for synastry charts */}
      {isSynastry && hasRelationshipScore && (
        <CompatibilityScoreCard relationshipScore={chart_data.relationship_score!} className="mb-6" />
      )}

      <ChartHighlights
        data={chart_data}
        secondaryData={processed.secondaryChartData}
        chartType={processed.effectiveChartType}
        houseComparison={houseComparison}
      />

      {/* Layout for DUAL charts: Lunar phases on top (side by side), Key Aspects below */}
      {secondaryData ? (
        <>
          {/* Lunar Phase Cards - Side by side for dual charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Primary Lunar Phase */}
            {(() => {
              // For ALL dual charts, the primary data is in first_subject or subject
              const lunarPhase =
                chart_data.first_subject?.lunar_phase ||
                data.chart_data?.subject?.lunar_phase ||
                data.chart_data?.lunar_phase
              const month = chart_data.first_subject?.month || data.chart_data?.subject?.month

              return lunarPhase ? (
                <div className="relative">
                  <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {primaryLabel} Lunar Phase
                  </div>
                  <LunarPhaseCard lunarPhase={lunarPhase} month={month || undefined} />
                </div>
              ) : null
            })()}

            {/* Secondary Lunar Phase */}
            {(() => {
              // Try multiple sources for secondary lunar phase
              const secondaryLunarPhase =
                secondaryData.chart_data?.subject?.lunar_phase ||
                processed.secondaryChartData?.subject?.lunar_phase ||
                secondaryData.chart_data?.lunar_phase ||
                processed.secondaryChartData?.lunar_phase

              const secondaryMonth =
                secondaryData.chart_data?.subject?.month || processed.secondaryChartData?.subject?.month

              return secondaryLunarPhase ? (
                <div className="relative">
                  <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    {secondaryLabel} Lunar Phase
                  </div>
                  <LunarPhaseCard lunarPhase={secondaryLunarPhase} month={secondaryMonth} />
                </div>
              ) : null
            })()}
          </div>

          {/* Key Aspects Section - Full width below lunar phases */}
          <div className="mb-6">
            <KeyAspectsSection
              aspects={aspectsToUse}
              maxAspects={6}
              className="mb-0"
              chartType={processed.effectiveChartType}
            />
          </div>
        </>
      ) : (
        /* Layout for SINGLE charts: Lunar phase left (1/3), Key Aspects right (2/3) */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Lunar Phase Card */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            {(() => {
              const phaseData = getLunarPhaseData(chart_data, processed.effectiveChartType)
              return phaseData.lunarPhase ? (
                <div className="relative h-full">
                  <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Lunar Phase
                  </div>
                  <LunarPhaseCard
                    lunarPhase={phaseData.lunarPhase}
                    month={phaseData.month || undefined}
                    className="h-full"
                  />
                </div>
              ) : null
            })()}
          </div>

          {/* Key Aspects Section */}
          <div className="lg:col-span-2 flex flex-col order-1 lg:order-2">
            <KeyAspectsSection
              aspects={aspectsToUse}
              maxAspects={6}
              className="h-full mb-0"
              chartType={processed.effectiveChartType}
            />
          </div>
        </div>
      )}

      {/* Distributions Section */}
      <div className="grid gap-6 md:grid-cols-2 mt-4">
        <div className="relative">
          <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
            <Flame className="h-4 w-4" />
            Elements Distribution
          </div>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={processed.elementsData}
                  margin={{ top: secondaryData ? -40 : 0, bottom: secondaryData ? -10 : 0 }}
                >
                  <PolarGrid stroke={processed.chartColors.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: processed.chartColors.text }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    dataKey="primary"
                    fill={processed.radarColors.primaryFill}
                    stroke={processed.radarColors.primaryStroke}
                    fillOpacity={0.6}
                  />
                  {secondaryData && (
                    <Radar
                      dataKey="secondary"
                      fill={processed.radarColors.secondaryFill}
                      stroke={processed.radarColors.secondaryStroke}
                      fillOpacity={0.6}
                    />
                  )}
                  <ChartTooltip cursor={false} content={<CustomTooltip />} />
                  {secondaryData && <ChartLegend className="mt-8" content={<ChartLegendContent />} />}
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Qualities Distribution
          </div>
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <RadarChart
                  cx="50%"
                  cy="50%"
                  outerRadius="70%"
                  data={processed.qualitiesData}
                  margin={{ top: secondaryData ? -40 : 0, bottom: secondaryData ? -10 : 0 }}
                >
                  <PolarGrid stroke={processed.chartColors.grid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: processed.chartColors.text }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    dataKey="primary"
                    fill={processed.radarColors.primaryFill}
                    stroke={processed.radarColors.primaryStroke}
                    fillOpacity={0.6}
                    dot={{
                      r: 4,
                      fillOpacity: 1,
                    }}
                  />
                  {secondaryData && (
                    <Radar
                      dataKey="secondary"
                      fill={processed.radarColors.secondaryFill}
                      stroke={processed.radarColors.secondaryStroke}
                      fillOpacity={0.6}
                    />
                  )}
                  <ChartTooltip cursor={false} content={<CustomTooltip />} />
                  {secondaryData && <ChartLegend className="mt-8" content={<ChartLegendContent />} />}
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Planetary Positions */}
      <div className="relative w-full">
        <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Planetary Positions
        </div>
        <Card className="shadow-sm">
          <CardContent className="p-0 pt-4">
            {secondaryData && processed.secondaryChartData ? (
              /* Tabbed view for dual charts */
              <Tabs
                defaultValue={processed.effectiveChartType === 'transit' ? 'secondary' : 'primary'}
                className="w-full"
              >
                <div className="px-4 pt-2">
                  <TabsList>
                    {processed.effectiveChartType === 'transit' ? (
                      /* Transit charts: show Transit tab first */
                      <>
                        <TabsTrigger
                          value="secondary"
                          className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                        >
                          {secondaryLabel}
                        </TabsTrigger>
                        <TabsTrigger
                          value="primary"
                          className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                        >
                          {primaryLabel}
                        </TabsTrigger>
                      </>
                    ) : (
                      /* Other dual charts: show Primary tab first */
                      <>
                        <TabsTrigger
                          value="primary"
                          className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                        >
                          {primaryLabel}
                        </TabsTrigger>
                        <TabsTrigger
                          value="secondary"
                          className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                        >
                          {secondaryLabel}
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </div>

                <TabsContent value="primary" className="mt-0">
                  <div className="relative w-full overflow-x-auto">
                    <table className="w-full min-w-[600px] caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Planet
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Sign
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Position
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            {primaryLabel} House
                          </th>
                          {/* Partner House column - hidden for transit charts since it's not useful */}
                          {processed.effectiveChartType !== 'transit' && (
                            <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              {secondaryLabel} House
                            </th>
                          )}
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Retro
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Speed
                          </th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {processed.sortedActivePoints.map((pointKey) => {
                          const key = pointKey.toLowerCase().replace(/_/g, '_')
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const point = (processed.primarySubject as any)[key]
                          if (!point || !point.sign) return null
                          return (
                            <tr
                              key={pointKey}
                              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                            >
                              <td className="p-2 sm:p-4 align-middle font-medium">
                                <span className="mr-2">{point.emoji}</span>
                                {point.name.replace(/_/g, ' ')}
                              </td>
                              <td className="p-2 sm:p-4 align-middle">{point.sign}</td>
                              <td className="p-2 sm:p-4 align-middle">
                                {Math.floor(point.position)}° {Math.round((point.position % 1) * 60)}&apos;
                              </td>
                              <td className="p-2 sm:p-4 align-middle">{point.house?.replace(/_/g, ' ')}</td>
                              {/* Partner House column - hidden for transit charts */}
                              {processed.effectiveChartType !== 'transit' && (
                                <td className="p-2 sm:p-4 align-middle">
                                  {(() => {
                                    const partnerHouse = findPartnerHouse(point.name, houseComparison, true)
                                    return formatOrdinalHouse(partnerHouse)
                                  })()}
                                </td>
                              )}
                              <td className="p-2 sm:p-4 align-middle">
                                {point.retrograde ? <span className="text-destructive">Rx</span> : '-'}
                              </td>
                              <td className="p-2 sm:p-4 align-middle">
                                {point.speed !== undefined && point.speed !== null ? point.speed.toFixed(2) : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="secondary" className="mt-0">
                  <div className="relative w-full overflow-x-auto">
                    <table className="w-full min-w-[600px] caption-bottom text-sm">
                      <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Planet
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Sign
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Position
                          </th>
                          {/* Transit House column - hidden for transit charts since it's not useful */}
                          {processed.effectiveChartType !== 'transit' && (
                            <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                              {secondaryLabel} House
                            </th>
                          )}
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            {primaryLabel} House
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Retro
                          </th>
                          <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Speed
                          </th>
                        </tr>
                      </thead>
                      <tbody className="[&_tr:last-child]:border-0">
                        {processed.sortedSecondaryActivePoints.map((pointKey) => {
                          const key = pointKey.toLowerCase().replace(/_/g, '_')
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const point = (processed.secondaryChartData!.subject as any)[key]
                          if (!point || !point.sign) return null
                          return (
                            <tr
                              key={pointKey}
                              className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                            >
                              <td className="p-2 sm:p-4 align-middle font-medium">
                                <span className="mr-2">{point.emoji}</span>
                                {point.name.replace(/_/g, ' ')}
                              </td>
                              <td className="p-2 sm:p-4 align-middle">{point.sign}</td>
                              <td className="p-2 sm:p-4 align-middle">
                                {Math.floor(point.position)}° {Math.round((point.position % 1) * 60)}&apos;
                              </td>
                              {/* Transit House column - hidden for transit charts */}
                              {processed.effectiveChartType !== 'transit' && (
                                <td className="p-2 sm:p-4 align-middle">{point.house?.replace(/_/g, ' ')}</td>
                              )}
                              <td className="p-2 sm:p-4 align-middle">
                                {(() => {
                                  const partnerHouse = findPartnerHouse(point.name, houseComparison, false)
                                  return formatOrdinalHouse(partnerHouse)
                                })()}
                              </td>
                              <td className="p-2 sm:p-4 align-middle">
                                {point.retrograde ? <span className="text-destructive">Rx</span> : '-'}
                              </td>
                              <td className="p-2 sm:p-4 align-middle">
                                {point.speed !== undefined && point.speed !== null ? point.speed.toFixed(2) : '-'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Single table for non-dual charts */
              <div className="relative w-full overflow-x-auto">
                <table className="w-full min-w-[600px] caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Planet
                      </th>
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Sign
                      </th>
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Position
                      </th>
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        House
                      </th>
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Retro
                      </th>
                      <th className="h-10 px-2 sm:px-4 text-left align-middle font-medium text-muted-foreground text-xs uppercase tracking-wide">
                        Speed
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {processed.sortedActivePoints.map((pointKey) => {
                      const key = pointKey.toLowerCase().replace(/_/g, '_')
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const point = (processed.primarySubject as any)[key]
                      if (!point || !point.sign) return null
                      return (
                        <tr
                          key={pointKey}
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-2 sm:p-4 align-middle font-medium">
                            <span className="mr-2">{point.emoji}</span>
                            {point.name.replace(/_/g, ' ')}
                          </td>
                          <td className="p-2 sm:p-4 align-middle">{point.sign}</td>
                          <td className="p-2 sm:p-4 align-middle">
                            {Math.floor(point.position)}° {Math.round((point.position % 1) * 60)}&apos;
                          </td>
                          <td className="p-2 sm:p-4 align-middle">{point.house?.replace(/_/g, ' ')}</td>
                          <td className="p-2 sm:p-4 align-middle">
                            {point.retrograde ? <span className="text-destructive">Rx</span> : '-'}
                          </td>
                          <td className="p-2 sm:p-4 align-middle">
                            {point.speed !== undefined && point.speed !== null ? point.speed.toFixed(2) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* House Comparison for dual charts (excluding transits - house data for transits is in Planetary Positions) */}
      {houseComparison && processed.effectiveChartType !== 'transit' && (
        <HouseComparisonCard houseComparison={houseComparison} />
      )}
    </div>
  )
}
