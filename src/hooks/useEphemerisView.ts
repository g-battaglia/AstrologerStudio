'use client'

import { useMemo, useState } from 'react'
import { addDays, addMonths, addYears, endOfDay, startOfDay, startOfToday } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import type { EphemerisArray } from '@/types/ephemeris'
import {
  type EphemerisChartRow,
  type EphemerisTableRow,
  type PlanetKey,
  type PlanetColors,
  ALL_PLANET_KEYS,
  toColumnKey,
} from '../types/ephemeris-view'
import type { TimeRange } from '@/components/TimeRangeSelector'

/**
 * Convert decimal degrees to sexagesimal format
 * @param decimalDegrees - The decimal degree value to convert
 * @param includeSeconds - Whether to include seconds in the output (default: true)
 * @returns Formatted string: "DD°MM'SS"" if includeSeconds, otherwise "DD°MM'"
 * @example
 * toSexagesimal(123.456)       // "123°27'22""
 * toSexagesimal(123.456, false) // "123°27'"
 */
function toSexagesimal(decimalDegrees: number, includeSeconds = true): string {
  const degrees = Math.floor(decimalDegrees)
  const decimalMinutes = (decimalDegrees - degrees) * 60
  const minutes = Math.floor(decimalMinutes)

  if (includeSeconds) {
    const seconds = Math.round((decimalMinutes - minutes) * 60)
    return `${degrees}°${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`
  }

  return `${degrees}°${String(minutes).padStart(2, '0')}'`
}

export function mapToTable(data: EphemerisArray): EphemerisTableRow[] {
  return data.map((item) => {
    const date = new Date(item.date)
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' })

    const byName = new Map(item.planets.map((p) => [p.name, p]))
    const val = (name: string) => {
      const p = byName.get(name)
      return p ? `${p.emoji} ${toSexagesimal(p.position)}` : '-'
    }

    // Build the row dynamically
    const row: Record<string, number | string> = {
      id: date.getTime(),
      date: fmt.format(date),
      time: '', // Time column hidden but kept for type compatibility
    }

    // Add all points
    for (const point of ALL_PLANET_KEYS) {
      const key = toColumnKey(point)
      row[key] = val(point)
    }

    return row as EphemerisTableRow
  })
}

export function mapToChart(data: EphemerisArray): EphemerisChartRow[] {
  return data.map((item) => {
    const date = new Date(item.date)
    const byName = new Map(item.planets.map((p) => [p.name, p]))
    const chartValue = (name: string) => {
      const p = byName.get(name)
      return p ? Number(p.abs_pos.toFixed(3)) : undefined
    }
    const tooltipValue = (name: string) => {
      const p = byName.get(name)
      return p ? toSexagesimal(p.position) + '  ' + p.emoji : undefined
    }

    // Build the row dynamically
    const row: Partial<EphemerisChartRow> = {
      date: date.toISOString(),
    }

    // Add all points
    for (const point of ALL_PLANET_KEYS) {
      row[point] = chartValue(point)
      ;(row as Record<string, string | undefined>)[`${point}Label`] = tooltipValue(point)
    }

    return row as EphemerisChartRow
  })
}

export function useEphemerisView(data: EphemerisArray) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')

  // Derive the effective date range from timeRange
  const range = useMemo<DateRange | undefined>(() => {
    const from = startOfToday()

    switch (timeRange) {
      case 'week':
        return { from, to: addDays(from, 7) }
      case 'month':
        return { from, to: addMonths(from, 1) }
      case 'year':
        return { from, to: addYears(from, 1) }
      default:
        return { from, to: addMonths(from, 1) }
    }
  }, [timeRange])

  const filtered = useMemo(() => {
    const todayStart = startOfDay(startOfToday()).getTime()
    const hasRange = !!range?.from || !!range?.to
    const from = range?.from ? Math.max(startOfDay(range.from).getTime(), todayStart) : todayStart
    const to = range?.to ? endOfDay(range.to).getTime() : Infinity
    const src = hasRange ? data : data
    return src.filter((item) => {
      const t = new Date(item.date).getTime()
      return t >= from && t <= to
    })
  }, [data, range])

  const tableData = useMemo(() => mapToTable(filtered), [filtered])
  const chartData = useMemo(() => mapToChart(filtered), [filtered])

  const planetKeys: readonly PlanetKey[] = useMemo(() => ALL_PLANET_KEYS, [])

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

  return { timeRange, setTimeRange, range, filtered, tableData, chartData, planetKeys, colors }
}
