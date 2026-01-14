/**
 * Chart Highlights Content Generators
 *
 * This module contains functions that generate the highlight items
 * for each chart type. Each function returns an array of HighlightItem
 * objects that the ChartHighlights component renders.
 *
 * Separation from the main component keeps rendering logic clean.
 */

import { Aspect, HouseComparison, EnrichedSubjectModel } from '@/types/astrology'
import { Sun, Moon, ArrowUpCircle, Sparkles, RefreshCw, Heart, Sword } from 'lucide-react'
import {
  HighlightItem,
  formatPosition,
  formatSignDegree,
  formatAspect,
  findBestAspect,
  getAscendantRuler,
  getSignRuler,
} from '@/lib/astrology/chart-highlights'

// ============================================================================
// NATAL CHART
// ============================================================================

/**
 * Generates highlights for a Natal chart.
 * Shows: Sun (sign+deg+house), Moon (sign+deg+house), Ascendant (sign+deg)
 */
export function getNatalHighlights(subject: EnrichedSubjectModel): HighlightItem[] {
  return [
    {
      label: 'Sun',
      value: formatPosition(subject.sun),
      icon: <Sun className="h-4 w-4 text-orange-500" />,
    },
    {
      label: 'Moon',
      value: formatPosition(subject.moon),
      icon: <Moon className="h-4 w-4 text-slate-400" />,
    },
    {
      label: 'Ascendant',
      value: formatSignDegree(subject.ascendant),
      icon: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
    },
  ]
}

// ============================================================================
// TRANSIT CHART
// ============================================================================

/**
 * Finds the natal house for a transit planet from house_comparison data
 * Transit planets are in second_points_in_first_houses (transit → natal)
 */
function findNatalHouseForTransitPlanet(planetName: string, houseComparison?: HouseComparison): number | null {
  if (!houseComparison?.second_points_in_first_houses) return null

  const point = houseComparison.second_points_in_first_houses.find((p) => p.point_name === planetName)

  return point?.projected_house_number ?? null
}

/**
 * Formats a position with an optional natal house override
 */
function formatPositionWithNatalHouse(
  point: EnrichedSubjectModel[keyof EnrichedSubjectModel],
  natalHouse: number | null,
): string {
  if (!point || typeof point !== 'object' || !('sign' in point)) return 'Unknown'

  const deg = Math.floor(point.position)
  const min = Math.round((point.position % 1) * 60)
  const degStr = `${deg}°${min}'`

  // Use natal house if available, otherwise fall back to planet's own house
  const houseStr = natalHouse ? ` House ${natalHouse}` : point.house ? ` ${point.house.replace(/_/g, ' ')}` : ''

  return `${point.sign} ${degStr}${houseStr}`
}

/**
 * Generates highlights for a Transit chart.
 * Shows: Saturn (transit in natal house), Jupiter (transit in natal house), Mars (transit in natal house)
 *
 * @param transitSubject - The transit subject with planetary positions
 * @param _aspects - Not used currently
 * @param houseComparison - Optional house comparison data containing transit planets in natal houses
 */
export function getTransitHighlights(
  transitSubject: EnrichedSubjectModel,
  _aspects: Aspect[],
  houseComparison?: HouseComparison,
): HighlightItem[] {
  return [
    {
      label: 'Saturn',
      value: formatPositionWithNatalHouse(
        transitSubject.saturn,
        findNatalHouseForTransitPlanet('Saturn', houseComparison),
      ),
      icon: <RefreshCw className="h-4 w-4 text-slate-600" />,
    },
    {
      label: 'Jupiter',
      value: formatPositionWithNatalHouse(
        transitSubject.jupiter,
        findNatalHouseForTransitPlanet('Jupiter', houseComparison),
      ),
      icon: <Sparkles className="h-4 w-4 text-purple-500" />,
    },
    {
      label: 'Mars',
      value: formatPositionWithNatalHouse(transitSubject.mars, findNatalHouseForTransitPlanet('Mars', houseComparison)),
      icon: <Sword className="h-4 w-4 text-red-500" />,
    },
  ]
}

// ============================================================================
// SYNASTRY CHART
// ============================================================================

/**
 * Generates highlights for a Synastry chart.
 * Shows: Sun-Moon aspect, Venus-Mars aspect
 */
export function getSynastryHighlights(aspects: Aspect[]): HighlightItem[] {
  // Sun-Moon: prefer Sun-Moon, fallback to Sun-Sun, then any Sun/Moon combo
  const sunMoon =
    findBestAspect(
      aspects,
      (a) => (a.p1_name === 'Sun' && a.p2_name === 'Moon') || (a.p1_name === 'Moon' && a.p2_name === 'Sun'),
      false,
    ) ||
    findBestAspect(aspects, (a) => a.p1_name === 'Sun' && a.p2_name === 'Sun', false) ||
    findBestAspect(aspects, (a) => ['Sun', 'Moon'].includes(a.p1_name) && ['Sun', 'Moon'].includes(a.p2_name), true)

  // Venus-Mars: prefer exact, fallback to Venus/Mars/Asc combo
  let venusMars = findBestAspect(
    aspects,
    (a) => (a.p1_name === 'Venus' && a.p2_name === 'Mars') || (a.p1_name === 'Mars' && a.p2_name === 'Venus'),
    false,
  )
  if (!venusMars) {
    venusMars = findBestAspect(
      aspects,
      (a) => ['Venus', 'Mars', 'Ascendant'].includes(a.p1_name) && ['Venus', 'Mars', 'Ascendant'].includes(a.p2_name),
    )
  }

  return [
    {
      label: 'Sun–Moon',
      value: formatAspect(sunMoon),
      icon: <Sun className="h-4 w-4 text-orange-400" />,
    },
    {
      label: 'Venus–Mars',
      value: formatAspect(venusMars),
      icon: <Heart className="h-4 w-4 text-pink-500" />,
    },
  ]
}

// ============================================================================
// COMPOSITE CHART
// ============================================================================

/**
 * Generates highlights for a Composite chart.
 * Shows: Composite Sun, Composite Moon, Composite Ascendant
 */
export function getCompositeHighlights(subject: EnrichedSubjectModel, _aspects: Aspect[]): HighlightItem[] {
  return [
    {
      label: 'Composite Sun',
      value: formatPosition(subject.sun),
      icon: <Sun className="h-4 w-4 text-orange-500" />,
    },
    {
      label: 'Composite Moon',
      value: formatPosition(subject.moon),
      icon: <Moon className="h-4 w-4 text-slate-400" />,
    },
    {
      label: 'Composite Ascendant',
      value: formatSignDegree(subject.ascendant),
      icon: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
    },
  ]
}

// ============================================================================
// RETURN CHARTS (Solar / Lunar)
// ============================================================================

/**
 * Generates highlight items for Solar/Lunar Return charts.
 *
 * Priorities:
 * 1. Ascendant Ruler (Dispositore dell'Ascendente) of the Return chart
 * 2. Return Ascendant position in Natal House
 * 3. Key Aspects (Synastry-like between Return and Natal or internal Return aspects)
 */
export function getReturnHighlights(
  returnSubject: EnrichedSubjectModel | undefined,
  _natalSubject: EnrichedSubjectModel | undefined,
  aspects: Aspect[],
  isSolar: boolean,
  rulershipMode: 'classical' | 'modern' = 'classical',
  houseComparison?: HouseComparison,
): HighlightItem[] {
  if (!returnSubject) return []

  const items: HighlightItem[] = []

  // 1. Return Ascendant (Always present)
  // Check for Natal House position from house_comparison (second_cusps_in_first_houses)
  let natalHouseDetail: string | undefined

  if (returnSubject.ascendant && houseComparison?.second_cusps_in_first_houses) {
    // Find the Return Ascendant (First_House) in the house comparison data
    const ascInNatal = houseComparison.second_cusps_in_first_houses.find(
      (p) => p.point_name === 'First_House' || p.point_name === 'Ascendant',
    )
    if (ascInNatal) {
      natalHouseDetail = `Natal House ${ascInNatal.projected_house_number}`
    }
  }

  items.push({
    label: 'Return Ascendant',
    value: natalHouseDetail
      ? `${formatSignDegree(returnSubject.ascendant)} (${natalHouseDetail})`
      : formatSignDegree(returnSubject.ascendant),
    icon: <ArrowUpCircle className="h-4 w-4 text-blue-500" />,
    detail: natalHouseDetail ? 'Natal Position' : undefined,
  })

  // 2. Return Sun or Moon
  if (isSolar) {
    if (returnSubject.sun) {
      items.push({
        label: 'Return Sun',
        value: formatPosition(returnSubject.sun, true),
        icon: <Sun className="h-4 w-4 text-orange-500" />,
      })
    }
  } else {
    if (returnSubject.moon) {
      items.push({
        label: 'Return Moon',
        value: formatPosition(returnSubject.moon, true),
        icon: <Moon className="h-4 w-4 text-blue-400" />,
      })
    }
  }

  // 3. Ascendant Ruler (Dispositore dell'Ascendente)
  const ascRuler = getAscendantRuler(returnSubject, rulershipMode)
  if (ascRuler) {
    const ascSign = returnSubject.ascendant?.sign
    const rulerName = getSignRuler(ascSign, rulershipMode)

    items.push({
      label: 'ASC Ruler',
      value: formatPosition(ascRuler, true),
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      detail: `Ruler of ${ascSign} (${rulerName})`,
    })
  } else {
    // Fallback info
    const ascSign = returnSubject.ascendant?.sign || '?'
    const rulerName = getSignRuler(ascSign, rulershipMode) || '?'

    items.push({
      label: 'ASC Ruler',
      value: `Unknown`,
      icon: <Sparkles className="h-4 w-4 text-amber-500" />,
      detail: `${ascSign} -> ${rulerName}?`,
    })
  }

  return items
}
