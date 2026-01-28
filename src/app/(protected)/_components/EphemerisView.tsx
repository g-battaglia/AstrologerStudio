'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { addDays, addMonths, addYears, startOfToday } from 'date-fns'
import type { ColumnDef } from '@/components/data-table/DataTable'
import { DataTable } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  ALL_PLANET_KEYS,
  toColumnKey,
  type EphemerisTableRow,
  type PlanetKey,
  type PlanetColors,
} from '@/types/ephemeris-view'
import { useEphemerisData } from '@/hooks/useEphemerisData'
import { mapToTable, mapToChart } from '@/hooks/useEphemerisView'
import { PlanetLegend } from '@/components/ephemeris/PlanetLegend'
import { ChartTooltip } from '@/components/ephemeris/ChartTooltip'
// RefreshCw icon commented out for now - see FIXME below
// import { RefreshCw } from 'lucide-react'
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector'
import type { ChartPreferencesData } from '@/actions/preferences'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'

interface EphemerisViewProps {
  preferences: ChartPreferencesData | null
  currentTimeRange: TimeRange
}

type ViewMode = 'table' | 'chart'

// All columns definition - headers derived from formatPlanetName for consistency
const ALL_COLUMNS: ColumnDef<EphemerisTableRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  // Time column hidden as requested - data is always at midnight
  // Generate planet columns dynamically from centralized ALL_PLANET_KEYS
  ...ALL_PLANET_KEYS.map((apiName) => ({
    accessorKey: toColumnKey(apiName),
    header: formatPlanetName(apiName),
  })),
]

export function EphemerisView({ preferences, currentTimeRange }: EphemerisViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<ViewMode>('table')
  const [timeRange, setTimeRangeState] = useState<TimeRange>(currentTimeRange)

  // Calculate date range based on timeRange
  const { startDate, endDate } = useMemo(() => {
    const start = startOfToday()
    let end: Date

    switch (timeRange) {
      case 'week':
        end = addDays(start, 7)
        break
      case 'month':
        end = addMonths(start, 1)
        break
      case 'year':
        end = addYears(start, 1)
        break
      default:
        end = addMonths(start, 1)
    }

    return { startDate: start, endDate: end }
  }, [timeRange])

  // Compute active planets from preferences BEFORE fetching data
  const activePlanets = useMemo<PlanetKey[]>(() => {
    if (!preferences?.active_points) {
      // Default to all planets if no preferences
      return [...ALL_PLANET_KEYS]
    }
    // Filter to only planets that exist in our ephemeris
    return preferences.active_points.filter((p): p is PlanetKey => ALL_PLANET_KEYS.includes(p as PlanetKey))
  }, [preferences])

  // Fetch data with the calculated date range and active points - this triggers API calls when range changes
  const {
    data = [],
    isLoading,
    error,
    progress,
    // refetch, - commented out as the refresh button is hidden (see FIXME below)
  } = useEphemerisData({
    startDate,
    endDate,
    activePoints: activePlanets,
  })

  // Generate columns based on active planets
  const columns = useMemo<ColumnDef<EphemerisTableRow>[]>(() => {
    const activeColumnKeys = new Set(['date', ...activePlanets.map((p) => toColumnKey(p))])
    return ALL_COLUMNS.filter((col) => {
      const key = 'accessorKey' in col ? col.accessorKey : undefined
      return key && activeColumnKeys.has(key as keyof EphemerisTableRow)
    })
  }, [activePlanets])

  // Planet keys for chart (filtered by preferences)
  const planetKeys = useMemo<readonly PlanetKey[]>(() => {
    return activePlanets as PlanetKey[]
  }, [activePlanets])

  const colors: PlanetColors = useMemo(
    () => ({
      // Core planets
      Sun: { stroke: '#f59e0b', fill: '#f59e0b' },
      Moon: { stroke: '#6b7280', fill: '#6b7280' },
      Mercury: { stroke: '#3b82f6', fill: '#3b82f6' },
      Venus: { stroke: '#ec4899', fill: '#ec4899' },
      Mars: { stroke: '#ef4444', fill: '#ef4444' },
      Jupiter: { stroke: '#8b5cf6', fill: '#8b5cf6' },
      Saturn: { stroke: '#eab308', fill: '#eab308' },
      Uranus: { stroke: '#06b6d4', fill: '#06b6d4' },
      Neptune: { stroke: '#60a5fa', fill: '#60a5fa' },
      Pluto: { stroke: '#10b981', fill: '#10b981' },
      // Lunar nodes
      Mean_North_Lunar_Node: { stroke: '#c084fc', fill: '#c084fc' },
      True_North_Lunar_Node: { stroke: '#a855f7', fill: '#a855f7' },
      Mean_South_Lunar_Node: { stroke: '#9333ea', fill: '#9333ea' },
      True_South_Lunar_Node: { stroke: '#7c3aed', fill: '#7c3aed' },
      // Centaurs & minor bodies
      Chiron: { stroke: '#22c55e', fill: '#22c55e' },
      Pholus: { stroke: '#16a34a', fill: '#16a34a' },
      // Lilith
      Mean_Lilith: { stroke: '#475569', fill: '#475569' },
      True_Lilith: { stroke: '#64748b', fill: '#64748b' },
      // Earth
      Earth: { stroke: '#059669', fill: '#059669' },
      // Asteroids
      Ceres: { stroke: '#84cc16', fill: '#84cc16' },
      Pallas: { stroke: '#a3e635', fill: '#a3e635' },
      Juno: { stroke: '#bef264', fill: '#bef264' },
      Vesta: { stroke: '#d9f99d', fill: '#d9f99d' },
      // Dwarf planets
      Eris: { stroke: '#f43f5e', fill: '#f43f5e' },
      Sedna: { stroke: '#e11d48', fill: '#e11d48' },
      Haumea: { stroke: '#be185d', fill: '#be185d' },
      Makemake: { stroke: '#db2777', fill: '#db2777' },
      Ixion: { stroke: '#ec4899', fill: '#ec4899' },
      Orcus: { stroke: '#f472b6', fill: '#f472b6' },
      Quaoar: { stroke: '#f9a8d4', fill: '#f9a8d4' },
      // Fixed stars
      Regulus: { stroke: '#fbbf24', fill: '#fbbf24' },
      Spica: { stroke: '#fcd34d', fill: '#fcd34d' },
      // Axes
      Ascendant: { stroke: '#f97316', fill: '#f97316' },
      Medium_Coeli: { stroke: '#facc15', fill: '#facc15' },
      Descendant: { stroke: '#fb923c', fill: '#fb923c' },
      Imum_Coeli: { stroke: '#fde047', fill: '#fde047' },
      // Special points
      Vertex: { stroke: '#14b8a6', fill: '#14b8a6' },
      Anti_Vertex: { stroke: '#2dd4bf', fill: '#2dd4bf' },
      // Arabic parts
      Pars_Fortunae: { stroke: '#0ea5e9', fill: '#0ea5e9' },
      Pars_Spiritus: { stroke: '#38bdf8', fill: '#38bdf8' },
      Pars_Amoris: { stroke: '#7dd3fc', fill: '#7dd3fc' },
      Pars_Fidei: { stroke: '#bae6fd', fill: '#bae6fd' },
    }),
    [],
  )

  const [enabled, setEnabled] = useState<Record<PlanetKey, boolean>>(() => {
    if (!planetKeys?.length) return {} as Record<PlanetKey, boolean>
    return Object.fromEntries(planetKeys.map((k) => [k, true])) as Record<PlanetKey, boolean>
  })

  // Update enabled state when planetKeys changes
  useEffect(() => {
    if (planetKeys?.length) {
      setEnabled(Object.fromEntries(planetKeys.map((k) => [k, true])) as Record<PlanetKey, boolean>)
    }
  }, [planetKeys])

  const tableData = useMemo(() => mapToTable(data), [data])
  const chartData = useMemo(() => mapToChart(data), [data])

  const setAll = useCallback(
    (value: boolean) => {
      if (!planetKeys?.length) return
      setEnabled(Object.fromEntries(planetKeys.map((k) => [k, value])) as Record<PlanetKey, boolean>)
    },
    [planetKeys],
  )

  const CustomTooltip = useMemo(() => ChartTooltip({ enabled, colors }), [enabled, colors])

  // Handle range change - update URL
  const handleRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRangeState(range)
      const params = new URLSearchParams(searchParams)
      params.set('range', range)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router],
  )

  return (
    <div className="w-full p-0 md:p-2 flex flex-col gap-6">
      <div className="flex items-start flex-wrap gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ephemeris</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1 text-sm">
            The positions of celestial bodies in the sky at a given time (midnight UTC).
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* FIXME: Refresh button hidden for now
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          */}
          <TimeRangeSelector value={timeRange} onChange={handleRangeChange} />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Error: {error.message}
        </div>
      )}

      {isLoading && data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Starting to load ephemeris data...</p>
        </div>
      ) : (
        <>
          {isLoading && progress.total > 0 && (
            <div className="flex items-center justify-center gap-3 py-2 px-4 bg-muted/50 rounded-md">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-sm font-medium">
                Loading: {progress.current}/{progress.total} days
              </p>
            </div>
          )}
          <Tabs value={mode} onValueChange={(v) => setMode(v as ViewMode)} defaultValue="table" className="w-full">
            <TabsContent value="table" className="mt-0">
              <DataTable<EphemerisTableRow, unknown>
                data={tableData}
                columns={columns}
                isLoading={false}
                tableId="ephemeris"
                toolbarActions={
                  <TabsList className="h-8 p-0.5 gap-1 bg-muted/70">
                    <TabsTrigger
                      value="table"
                      className="h-7 px-2 py-0 text-xs data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                    >
                      Table
                    </TabsTrigger>
                    <TabsTrigger
                      value="chart"
                      className="h-7 px-2 py-0 text-xs data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                    >
                      Chart
                    </TabsTrigger>
                  </TabsList>
                }
              />
            </TabsContent>

            <TabsContent value="chart" className="mt-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <TabsList className="h-8 p-0.5 gap-1 bg-muted/70">
                    <TabsTrigger
                      value="table"
                      className="h-7 px-2 py-0 text-xs data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                    >
                      Table
                    </TabsTrigger>
                    <TabsTrigger
                      value="chart"
                      className="h-7 px-2 py-0 text-xs data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                    >
                      Chart
                    </TabsTrigger>
                  </TabsList>
                  <div className="ml-auto flex">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-14 px-3 text-xs rounded-r-none border-r-0"
                      onClick={() => setAll(true)}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 w-14 px-3 text-xs rounded-l-none"
                      onClick={() => setAll(false)}
                    >
                      None
                    </Button>
                  </div>
                </div>
                {chartData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No chart data available.</div>
                ) : (
                  <div className="w-full">
                    {planetKeys?.length ? (
                      <PlanetLegend planetKeys={planetKeys} enabled={enabled} setEnabled={setEnabled} colors={colors} />
                    ) : null}
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            {planetKeys.map((planet) => (
                              <linearGradient key={planet} id={`color-${planet}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={colors[planet].stroke} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={colors[planet].stroke} stopOpacity={0.05} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString()}
                            className="text-xs"
                          />
                          <YAxis domain={[0, 360]} tickFormatter={(value) => `${value}°`} className="text-xs" />
                          <Tooltip content={<CustomTooltip />} />

                          {planetKeys
                            .filter((planet) => enabled[planet])
                            .map((planet) => (
                              <Area
                                key={planet}
                                type="monotone"
                                dataKey={planet}
                                stroke={colors[planet].stroke}
                                fillOpacity={1}
                                fill={`url(#color-${planet})`}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false}
                              />
                            ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
