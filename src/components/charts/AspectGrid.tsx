'use client'

import { Fragment, useMemo } from 'react'
import { Aspect, Point, EnrichedSubjectModel } from '@/types/astrology'
import { cn } from '@/lib/utils/cn'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'
import { ASPECT_SYMBOLS } from '@/lib/astrology/aspects'
import { AspectTooltipContent } from './AspectTooltipContent'

import { AspectGridLegend } from './AspectGridLegend'

interface AspectGridProps {
  aspects: Aspect[]
  type: 'single' | 'double'
  className?: string
  activePoints?: string[]
  rowLabel?: string
  colLabel?: string
  /** Subject data for row planets (p1) - used to look up positions */
  rowSubject?: EnrichedSubjectModel
  /** Subject data for column planets (p2) - used to look up positions */
  colSubject?: EnrichedSubjectModel
}

export const PLANET_LABELS: Record<string, string> = {
  Sun: 'Sun',
  Moon: 'Mon',
  Mercury: 'Mer',
  Venus: 'Ven',
  Mars: 'Mar',
  Jupiter: 'Jup',
  Saturn: 'Sat',
  Uranus: 'Ura',
  Neptune: 'Nep',
  Pluto: 'Plu',
  Mean_North_Lunar_Node: 'MNN',
  True_North_Lunar_Node: 'TNN',
  Mean_South_Lunar_Node: 'MSN',
  True_South_Lunar_Node: 'TSN',
  Chiron: 'Chi',
  Mean_Lilith: 'MLil',
  True_Lilith: 'TLil',
  Earth: 'Ear',
  Pholus: 'Pho',
  Ceres: 'Cer',
  Pallas: 'Pal',
  Juno: 'Jun',
  Vesta: 'Ves',
  Eris: 'Eri',
  Sedna: 'Sed',
  Haumea: 'Hau',
  Makemake: 'Mak',
  Ixion: 'Ixi',
  Orcus: 'Orc',
  Quaoar: 'Qua',
  Regulus: 'Reg',
  Spica: 'Spi',
  Ascendant: 'Asc',
  Medium_Coeli: 'MC',
  Descendant: 'Dsc',
  Imum_Coeli: 'IC',
  Vertex: 'Vtx',
  Anti_Vertex: 'Avx',
  Pars_Fortunae: 'PF',
  Pars_Spiritus: 'PS',
  Pars_Amoris: 'PA',
  Pars_Fidei: 'PFi',
}

export const ASPECT_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  conjunction: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
  opposition: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
  square: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
  trine: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40' },
  sextile: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
  quincunx: { text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
  'semi-sextile': { text: 'text-blue-500 dark:text-blue-300', bg: 'bg-blue-400/20', border: 'border-blue-400/40' },
  'semi-square': { text: 'text-red-500 dark:text-red-300', bg: 'bg-red-400/20', border: 'border-red-400/40' },
  sesquiquadrate: { text: 'text-red-500 dark:text-red-300', bg: 'bg-red-400/20', border: 'border-red-400/40' },
  quintile: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' },
  'bi-quintile': {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/40',
  },
  biquintile: {
    text: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/40',
  },
}

function formatOrb(orb: number): string {
  const degrees = Math.floor(orb)
  const minutes = Math.round((orb - degrees) * 60)
  return `${degrees}°${minutes.toString().padStart(2, '0')}'`
}

/** Format Point position using sign and position from API (e.g. "23° Sag") */
function formatPointPosition(point: Point | number | undefined): string {
  if (!point || typeof point === 'number') return '–'
  const deg = Math.floor(point.position)
  // Use first 3 letters of sign name
  const signAbbr = point.sign?.slice(0, 3) || '?'
  return `${deg}° ${signAbbr}`
}

function getAspectSymbol(aspectName: string) {
  return ASPECT_SYMBOLS[aspectName.toLowerCase()] || aspectName.charAt(0).toUpperCase()
}

export function getAspectStyles(aspectName: string) {
  return (
    ASPECT_STYLES[aspectName.toLowerCase()] || {
      text: 'text-foreground',
      bg: 'bg-card',
      border: 'border-muted/20',
    }
  )
}

export function AspectGrid({
  aspects,
  type,
  className,
  activePoints,
  rowLabel,
  colLabel,
  rowSubject,
  colSubject,
}: AspectGridProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // Helper to look up position from subject data
  const getPositionFromSubject = (
    planetName: string,
    subject: EnrichedSubjectModel | undefined,
  ): string | undefined => {
    if (!subject) return undefined
    // Convert planet name to lowercase with underscores (e.g., "True_North_Lunar_Node" -> "true_north_lunar_node")
    const key = planetName.toLowerCase().replace(/ /g, '_') as keyof EnrichedSubjectModel
    const point = subject[key]
    if (point && typeof point === 'object' && 'position' in point && 'sign' in point) {
      const p = point as Point
      return `${Math.floor(p.position)}° ${p.sign}`
    }
    return undefined
  }

  // For double charts, separate row planets (p1/first subject) from column planets (p2/second subject)
  // For single charts, use the same list for both
  const { rowPlanets, colPlanets } = useMemo(() => {
    if (type === 'single') {
      // Single chart: same planets for both rows and columns
      const planetSet = new Set<string>()
      aspects.forEach((aspect) => {
        planetSet.add(aspect.p1_name)
        planetSet.add(aspect.p2_name)
      })

      let availablePlanets = Array.from(planetSet)
      if (activePoints && activePoints.length > 0) {
        availablePlanets = availablePlanets.filter((p) => activePoints.includes(p))
      }

      const sortedPlanets = ALL_CELESTIAL_POINTS.filter((planet) => availablePlanets.includes(planet))
      return { rowPlanets: sortedPlanets, colPlanets: sortedPlanets }
    }

    // Double chart: rows = p1 (first subject/natal), columns = p2 (second subject/transit)
    const rowSet = new Set<string>()
    const colSet = new Set<string>()
    aspects.forEach((aspect) => {
      rowSet.add(aspect.p1_name)
      colSet.add(aspect.p2_name)
    })

    let rowAvailable = Array.from(rowSet)
    let colAvailable = Array.from(colSet)

    if (activePoints && activePoints.length > 0) {
      rowAvailable = rowAvailable.filter((p) => activePoints.includes(p))
      colAvailable = colAvailable.filter((p) => activePoints.includes(p))
    }

    return {
      rowPlanets: ALL_CELESTIAL_POINTS.filter((planet) => rowAvailable.includes(planet)),
      colPlanets: ALL_CELESTIAL_POINTS.filter((planet) => colAvailable.includes(planet)),
    }
  }, [aspects, activePoints, type])

  const getAspect = (rowPlanet: string, colPlanet: string) => {
    if (type === 'double') {
      // For double charts: row = p1 (first subject), col = p2 (second subject)
      // No need to check both directions since p1/p2 are from different subjects
      return aspects.find((a) => a.p1_name === rowPlanet && a.p2_name === colPlanet)
    }
    // For single charts: check both directions since aspects can be stored either way
    return aspects.find(
      (a) =>
        (a.p1_name === rowPlanet && a.p2_name === colPlanet) || (a.p1_name === colPlanet && a.p2_name === rowPlanet),
    )
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {type === 'double' && rowLabel && colLabel && <AspectGridLegend rowLabel={rowLabel} colLabel={colLabel} />}

      <div className="overflow-x-auto p-4 pt-0">
        <div className="inline-block min-w-full">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `auto repeat(${colPlanets.length}, minmax(48px, 1fr))`,
            }}
          >
            {/* Header Row */}
            <div className="h-10 w-10"></div>
            {colPlanets.map((planet) => (
              <div
                key={`col-${planet}`}
                className="flex h-10 items-center justify-center font-bold text-xs sm:text-sm truncate px-1 text-muted-foreground"
                title={colLabel ? `${colLabel} ${planet}` : planet}
              >
                {PLANET_LABELS[planet] || planet.slice(0, 3)}
              </div>
            ))}

            {/* Grid Rows */}
            {rowPlanets.map((rowPlanet, rowIndex) => (
              <Fragment key={rowPlanet}>
                {/* Row Label */}
                <div
                  key={`row-${rowPlanet}`}
                  className="flex h-16 w-10 items-center justify-start font-bold text-xs sm:text-sm px-1 text-muted-foreground"
                  title={rowLabel ? `${rowLabel} ${rowPlanet}` : rowPlanet}
                >
                  {PLANET_LABELS[rowPlanet] || rowPlanet.slice(0, 3)}
                </div>

                {/* Cells */}
                {colPlanets.map((colPlanet, colIndex) => {
                  // For single chart, we only render the lower triangle (colIndex < rowIndex)
                  if (type === 'single' && colIndex >= rowIndex) {
                    return <div key={`${rowPlanet}-${colPlanet}`} className="bg-muted/10 rounded-md" />
                  }

                  const aspect = getAspect(rowPlanet, colPlanet)

                  if (!aspect) {
                    return (
                      <div
                        key={`${rowPlanet}-${colPlanet}`}
                        className="flex h-16 items-center justify-center border border-muted/30 bg-muted/5 rounded-md"
                      />
                    )
                  }

                  const styles = getAspectStyles(aspect.aspect)

                  const TriggerContent = (
                    <div
                      className={cn(
                        'flex h-16 flex-col items-center justify-center border p-1 transition-colors cursor-default rounded-md w-full',
                        styles.bg,
                        styles.border,
                      )}
                    >
                      <span className={cn('text-lg sm:text-xl font-bold leading-none mb-1', styles.text)}>
                        {getAspectSymbol(aspect.aspect)}
                      </span>
                      <span className="font-mono text-[10px] opacity-80 leading-tight">{formatOrb(aspect.orbit)}</span>
                      <span className="font-medium text-[9px] uppercase text-muted-foreground leading-tight">
                        {aspect.aspect_movement === 'Applying'
                          ? 'A'
                          : aspect.aspect_movement === 'Separating'
                            ? 'S'
                            : '-'}
                      </span>
                    </div>
                  )

                  // Get position data: prefer subject lookup, fallback to aspect.p1/p2
                  const p1Position =
                    getPositionFromSubject(aspect.p1_name, rowSubject) ?? formatPointPosition(aspect.p1)
                  const p2Position =
                    getPositionFromSubject(aspect.p2_name, colSubject) ?? formatPointPosition(aspect.p2)

                  const TooltipContentBody = (
                    <AspectTooltipContent
                      aspect={aspect}
                      p1Position={p1Position}
                      p2Position={p2Position}
                      p1Label={rowLabel || 'Primary'}
                      p2Label={colLabel || 'Secondary'}
                    />
                  )

                  if (isDesktop) {
                    return (
                      <TooltipProvider key={`${rowPlanet}-${colPlanet}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>{TriggerContent}</TooltipTrigger>
                          <TooltipContent>{TooltipContentBody}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  }

                  return (
                    <Popover key={`${rowPlanet}-${colPlanet}`}>
                      <PopoverTrigger asChild>{TriggerContent}</PopoverTrigger>
                      <PopoverContent className="w-auto p-3">{TooltipContentBody}</PopoverContent>
                    </Popover>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

