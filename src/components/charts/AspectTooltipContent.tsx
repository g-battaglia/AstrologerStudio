'use client'

import { cn } from '@/lib/utils/cn'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import { ASPECT_SYMBOLS } from '@/lib/astrology/aspects'
import type { Aspect } from '@/types/astrology'

// Aspect color helpers
function getAspectTextColor(aspectName: string): string {
  const name = aspectName.toLowerCase()

  if (name === 'conjunction') return 'text-yellow-600 dark:text-yellow-400'
  if (name === 'opposition') return 'text-red-600 dark:text-red-400'
  if (name === 'square') return 'text-red-600 dark:text-red-400'
  if (name === 'trine') return 'text-green-600 dark:text-green-400'
  if (name === 'sextile') return 'text-blue-600 dark:text-blue-400'

  if (name === 'semi-sextile') return 'text-blue-500 dark:text-blue-300'
  if (name === 'semi-square' || name === 'sesquiquadrate') return 'text-red-500 dark:text-red-300'
  if (name === 'quincunx') return 'text-purple-600 dark:text-purple-400'
  if (name === 'quintile' || name === 'bi-quintile' || name === 'biquintile')
    return 'text-orange-600 dark:text-orange-400'

  return 'text-muted-foreground'
}

function getAspectTextSize(aspectName: string): string {
  const name = aspectName.toLowerCase()
  if (name === 'biquintile' || name === 'bi-quintile') return 'text-xs'
  if (name === 'opposition') return 'text-xl'
  return 'text-lg'
}

function getAspectSymbol(aspectName: string): string {
  const name = aspectName.toLowerCase()
  if (ASPECT_SYMBOLS[name]) return ASPECT_SYMBOLS[name]
  return aspectName.charAt(0).toUpperCase()
}

interface AspectTooltipContentProps {
  aspect: Aspect
  /** Date to display at the top (optional) */
  date?: string
  /** Position of P1 (the first planet in the aspect) */
  p1Position?: string
  /** Position of P2 (the second planet in the aspect) */
  p2Position?: string
  /** Label for the first planet's owner (e.g., "Natal", "Primary") */
  p1Label?: string
  /** Label for the second planet's owner (e.g., "Transit", "Secondary") */
  p2Label?: string
}

/**
 * Shared tooltip content component for aspect displays.
 * Used by both TimelineEventTable and AspectGrid for consistent tooltips.
 */
export function AspectTooltipContent({
  aspect,
  date,
  p1Position,
  p2Position,
  p1Label = 'Natal',
  p2Label = 'Transit',
}: AspectTooltipContentProps) {
  return (
    <div className="space-y-2 min-w-[180px]">
      {/* Date header (if provided) */}
      {date && <div className="font-semibold text-sm border-b pb-1">{date}</div>}

      {/* Aspect: P2 [symbol] P1 */}
      <div className="flex items-center gap-2">
        <span className="font-medium">{formatPlanetName(aspect.p2_name)}</span>
        <span
          className={cn(
            'w-4 h-4 flex-none flex items-center justify-center leading-none',
            getAspectTextColor(aspect.aspect),
            getAspectTextSize(aspect.aspect),
          )}
        >
          {getAspectSymbol(aspect.aspect)}
        </span>
        <span className="font-medium">{formatPlanetName(aspect.p1_name)}</span>
      </div>

      {/* Orb and Movement */}
      <div className="text-xs space-y-0.5">
        <div>Orb: {aspect.orbit.toFixed(2)}°</div>
        {aspect.aspect_movement && <div className="capitalize">Movement: {aspect.aspect_movement}</div>}
      </div>

      {/* Positions Grid */}
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs pt-1 border-t">
        <span>
          {formatPlanetName(aspect.p2_name)} ({p2Label}):
        </span>
        <span className="font-mono">{p2Position || 'N/A'}</span>
        <span>
          {formatPlanetName(aspect.p1_name)} ({p1Label}):
        </span>
        <span className="font-mono">{p1Position || 'N/A'}</span>
      </div>
    </div>
  )
}
