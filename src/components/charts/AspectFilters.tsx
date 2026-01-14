'use client'

import { useMemo } from 'react'
import { Aspect } from '@/types/astrology'
import { MultiSelectFilter } from '@/components/MultiSelectFilter'
import { ALL_CELESTIAL_POINTS, CelestialPointName } from '@/lib/astrology/celestial-points'

import { PLANET_LABELS } from './AspectGrid'
import { OrbFilterInput } from './OrbFilterInput'

interface AspectFiltersProps {
  aspects: Aspect[]
  selectedPlanets: string[]
  selectedAspects: string[]
  onPlanetsChange: (selected: string[]) => void
  onAspectsChange: (selected: string[]) => void
  activePoints?: string[]
  maxOrb: number | undefined
  onMaxOrbChange: (value: number | undefined) => void
}

const getCelestialOrderIndex = (name: string) => {
  const idx = ALL_CELESTIAL_POINTS.indexOf(name as CelestialPointName)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

export function AspectFilters({
  aspects,
  selectedPlanets,
  selectedAspects,
  onPlanetsChange,
  onAspectsChange,
  activePoints,
  maxOrb,
  onMaxOrbChange,
}: AspectFiltersProps) {
  // ...

  // Extract unique planets from aspects
  const planetOptions = useMemo(() => {
    const planetSet = new Set<string>()
    aspects.forEach((aspect) => {
      planetSet.add(aspect.p1_name)
      planetSet.add(aspect.p2_name)
    })

    let planets = Array.from(planetSet)

    // Filter by activePoints if provided
    if (activePoints && activePoints.length > 0) {
      planets = planets.filter((p) => activePoints.includes(p))
    }

    const sortedPlanets = planets.sort((a, b) => getCelestialOrderIndex(a) - getCelestialOrderIndex(b))

    return sortedPlanets.map((planet) => ({
      value: planet,
      label: PLANET_LABELS[planet] || planet,
    }))
  }, [aspects, activePoints])

  // Extract unique aspect types from aspects
  const aspectOptions = useMemo(() => {
    const aspectSet = new Set<string>()
    aspects.forEach((aspect) => {
      aspectSet.add(aspect.aspect)
    })
    return Array.from(aspectSet)
      .sort()
      .map((aspect) => ({
        value: aspect,
        label: aspect.charAt(0).toUpperCase() + aspect.slice(1),
      }))
  }, [aspects])

  return (
    <div className="flex flex-wrap gap-2 mb-4 items-end">
      <MultiSelectFilter
        title="Planets"
        options={planetOptions}
        selected={selectedPlanets}
        onChange={onPlanetsChange}
        className="w-40"
      />
      <MultiSelectFilter
        title="Aspects"
        options={aspectOptions}
        selected={selectedAspects}
        onChange={onAspectsChange}
        className="w-40"
      />
      <OrbFilterInput value={maxOrb} onChange={onMaxOrbChange} />
    </div>
  )
}
