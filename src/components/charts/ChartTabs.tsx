'use client'

import { ReactNode, useState, useMemo, useEffect } from 'react'
import * as React from 'react'
import { BarChart3, Table, PieChart, Sparkles, Grid3X3 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import { AspectFilters } from './AspectFilters'
import { OrbFilterInput } from './OrbFilterInput'
import type { Aspect } from '@/types/astrology'
import { MultiSelectFilter, type FilterOption } from '@/components/MultiSelectFilter'
import { PLANET_LABELS } from './AspectGrid'
import { ALL_CELESTIAL_POINTS, CelestialPointName } from '@/lib/astrology/celestial-points'

interface ChartTabsProps {
  chartContent: ReactNode
  aspectsContent: ReactNode
  gridContent?: ReactNode
  dataContent?: ReactNode
  interpretationContent?: ReactNode
  defaultTab?: 'chart' | 'aspects' | 'grid' | 'data' | 'interpretation'
  aspects?: Aspect[]
  activePoints?: string[]
  aspectFilterType?: 'single' | 'double'
  primaryFilterLabel?: string
  secondaryFilterLabel?: string
}

const getCelestialOrderIndex = (name: string) => {
  const idx = ALL_CELESTIAL_POINTS.indexOf(name as CelestialPointName)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

export function ChartTabsList({
  hasData = false,
  hasInterpretation = false,
}: {
  hasData?: boolean
  hasInterpretation?: boolean
  hasGrid?: boolean // Deprecated, kept for backward compatibility during refactor
}) {
  const { enabled } = useAIInterpretation()

  return (
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
      {hasInterpretation && enabled && (
        <TabsTrigger value="interpretation" className="gap-2">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Interpretation</span>
        </TabsTrigger>
      )}
    </TabsList>
  )
}

export function ChartTabContents({
  chartContent,
  aspectsContent,
  gridContent,
  dataContent,
  interpretationContent,
  aspects = [],
  activePoints,
  aspectFilterType = 'single',
  primaryFilterLabel,
  secondaryFilterLabel,
}: ChartTabsProps) {
  const { enabled } = useAIInterpretation()
  const isDualFilter = aspectFilterType === 'double'

  // Filter state for aspects
  const [selectedPlanets, setSelectedPlanets] = useState<string[]>([])
  const [selectedAspects, setSelectedAspects] = useState<string[]>([])
  const [selectedPrimaryPlanets, setSelectedPrimaryPlanets] = useState<string[]>([])
  const [selectedSecondaryPlanets, setSelectedSecondaryPlanets] = useState<string[]>([])
  const [maxOrb, setMaxOrb] = useState<number | undefined>(undefined)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Initialize filters with all options on first load, then keep user choices across aspect changes
  useEffect(() => {
    if (aspects.length === 0) return

    const planetSet = new Set<string>()
    const aspectSet = new Set<string>()
    const primarySet = new Set<string>()
    const secondarySet = new Set<string>()
    aspects.forEach((aspect) => {
      planetSet.add(aspect.p1_name)
      planetSet.add(aspect.p2_name)
      aspectSet.add(aspect.aspect)
      primarySet.add(aspect.p1_name)
      secondarySet.add(aspect.p2_name)
    })

    let allPlanets = Array.from(planetSet)
    if (activePoints && activePoints.length > 0) {
      allPlanets = allPlanets.filter((p) => activePoints.includes(p))
    }

    const allAspects = Array.from(aspectSet)

    if (!filtersInitialized) {
      if (isDualFilter) {
        let primaryPlanets = Array.from(primarySet)
        let secondaryPlanets = Array.from(secondarySet)
        if (activePoints && activePoints.length > 0) {
          primaryPlanets = primaryPlanets.filter((p) => activePoints.includes(p))
          secondaryPlanets = secondaryPlanets.filter((p) => activePoints.includes(p))
        }
        setSelectedPrimaryPlanets(primaryPlanets)
        setSelectedSecondaryPlanets(secondaryPlanets)
      } else {
        setSelectedPlanets(allPlanets)
      }
      setSelectedAspects(allAspects)
      setFiltersInitialized(true)
      return
    }

    if (isDualFilter) {
      const primaryAvailable = new Set(
        activePoints && activePoints.length > 0
          ? Array.from(primarySet).filter((p) => activePoints.includes(p))
          : Array.from(primarySet),
      )
      const secondaryAvailable = new Set(
        activePoints && activePoints.length > 0
          ? Array.from(secondarySet).filter((p) => activePoints.includes(p))
          : Array.from(secondarySet),
      )
      setSelectedPrimaryPlanets((prev) => prev.filter((p) => primaryAvailable.has(p)))
      setSelectedSecondaryPlanets((prev) => prev.filter((p) => secondaryAvailable.has(p)))
    } else {
      const planetAvailable = new Set(allPlanets)
      setSelectedPlanets((prev) => prev.filter((p) => planetAvailable.has(p)))
    }

    const aspectAvailable = new Set(allAspects)
    setSelectedAspects((prev) => prev.filter((a) => aspectAvailable.has(a)))
  }, [aspects, activePoints, filtersInitialized, isDualFilter])

  // Filter aspects based on selected planets and aspect types
  const filteredAspects = useMemo(() => {
    if (aspects.length === 0) return []

    if (isDualFilter) {
      return aspects.filter(
        (aspect) =>
          selectedAspects.includes(aspect.aspect) &&
          selectedPrimaryPlanets.includes(aspect.p1_name) &&
          selectedSecondaryPlanets.includes(aspect.p2_name) &&
          (maxOrb === undefined || aspect.orbit <= maxOrb),
      )
    }

    return aspects.filter(
      (aspect) =>
        selectedAspects.includes(aspect.aspect) &&
        selectedPlanets.includes(aspect.p1_name) &&
        selectedPlanets.includes(aspect.p2_name) &&
        (maxOrb === undefined || aspect.orbit <= maxOrb),
    )
  }, [
    aspects,
    isDualFilter,
    selectedAspects,
    selectedPlanets,
    selectedPrimaryPlanets,
    selectedSecondaryPlanets,
    maxOrb,
  ])

  const dualPlanetOptions = useMemo(() => {
    if (!isDualFilter || aspects.length === 0) {
      return { primary: [] as FilterOption[], secondary: [] as FilterOption[] }
    }

    const primarySet = new Set<string>()
    const secondarySet = new Set<string>()
    aspects.forEach((aspect) => {
      primarySet.add(aspect.p1_name)
      secondarySet.add(aspect.p2_name)
    })

    const filterByActivePoints = (names: string[]) => {
      if (activePoints && activePoints.length > 0) {
        return names.filter((name) => activePoints.includes(name))
      }
      return names
    }

    const primaryPlanets = filterByActivePoints(Array.from(primarySet))
      .sort((a, b) => getCelestialOrderIndex(a) - getCelestialOrderIndex(b))
      .map((planet) => ({
        value: planet,
        label: PLANET_LABELS[planet] || planet,
      }))

    const secondaryPlanets = filterByActivePoints(Array.from(secondarySet))
      .sort((a, b) => getCelestialOrderIndex(a) - getCelestialOrderIndex(b))
      .map((planet) => ({
        value: planet,
        label: PLANET_LABELS[planet] || planet,
      }))

    return { primary: primaryPlanets, secondary: secondaryPlanets }
  }, [aspects, activePoints, isDualFilter])

  const aspectOptions = useMemo<FilterOption[]>(() => {
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

  // Clone aspectsContent and gridContent with filtered aspects using React.cloneElement
  const filteredAspectsContent = useMemo(() => {
    if (!aspectsContent || typeof aspectsContent !== 'object') return aspectsContent
    if (React.isValidElement(aspectsContent)) {
      return React.cloneElement(aspectsContent, { aspects: filteredAspects } as React.Attributes & {
        aspects: Aspect[]
      })
    }
    return aspectsContent
  }, [aspectsContent, filteredAspects])

  const filteredGridContent = useMemo(() => {
    if (!gridContent || typeof gridContent !== 'object') return gridContent
    if (React.isValidElement(gridContent)) {
      return React.cloneElement(gridContent, { aspects: filteredAspects } as React.Attributes & { aspects: Aspect[] })
    }
    return gridContent
  }, [gridContent, filteredAspects])

  const dualPrimaryLabel = primaryFilterLabel || 'Chart 1 Planets'
  const dualSecondaryLabel = secondaryFilterLabel || 'Chart 2 Planets'

  return (
    <>
      <TabsContent value="chart" className="mt-0">
        {chartContent}
      </TabsContent>

      <TabsContent value="aspects" className="mt-0">
        {gridContent ? (
          <Tabs defaultValue="grid" className="w-full">
            <div className="mb-4 flex flex-col-reverse md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1">
                {aspects.length > 0 &&
                  (!isDualFilter ? (
                    <AspectFilters
                      aspects={aspects}
                      selectedPlanets={selectedPlanets}
                      selectedAspects={selectedAspects}
                      onPlanetsChange={setSelectedPlanets}
                      onAspectsChange={setSelectedAspects}
                      activePoints={activePoints}
                      maxOrb={maxOrb}
                      onMaxOrbChange={setMaxOrb}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <MultiSelectFilter
                        title={dualPrimaryLabel}
                        options={dualPlanetOptions.primary}
                        selected={selectedPrimaryPlanets}
                        onChange={setSelectedPrimaryPlanets}
                        className="w-40"
                      />
                      <MultiSelectFilter
                        title={dualSecondaryLabel}
                        options={dualPlanetOptions.secondary}
                        selected={selectedSecondaryPlanets}
                        onChange={setSelectedSecondaryPlanets}
                        className="w-40"
                      />
                      <MultiSelectFilter
                        title="Aspects"
                        options={aspectOptions}
                        selected={selectedAspects}
                        onChange={setSelectedAspects}
                        className="w-40"
                      />
                      <OrbFilterInput value={maxOrb} onChange={setMaxOrb} />
                    </div>
                  ))}
              </div>
              <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
                <TabsTrigger value="grid" className="gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Grid
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <Table className="h-4 w-4" />
                  List
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="grid" className="mt-0">
              {filteredGridContent}
            </TabsContent>
            <TabsContent value="list" className="mt-0">
              {filteredAspectsContent}
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {aspects.length > 0 && (
              <div className="mb-4">
                {!isDualFilter ? (
                  <AspectFilters
                    aspects={aspects}
                    selectedPlanets={selectedPlanets}
                    selectedAspects={selectedAspects}
                    onPlanetsChange={setSelectedPlanets}
                    onAspectsChange={setSelectedAspects}
                    activePoints={activePoints}
                    maxOrb={maxOrb}
                    onMaxOrbChange={setMaxOrb}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <MultiSelectFilter
                      title={dualPrimaryLabel}
                      options={dualPlanetOptions.primary}
                      selected={selectedPrimaryPlanets}
                      onChange={setSelectedPrimaryPlanets}
                      className="w-40"
                    />
                    <MultiSelectFilter
                      title={dualSecondaryLabel}
                      options={dualPlanetOptions.secondary}
                      selected={selectedSecondaryPlanets}
                      onChange={setSelectedSecondaryPlanets}
                      className="w-40"
                    />
                    <MultiSelectFilter
                      title="Aspects"
                      options={aspectOptions}
                      selected={selectedAspects}
                      onChange={setSelectedAspects}
                      className="w-40"
                    />
                    <OrbFilterInput value={maxOrb} onChange={setMaxOrb} />
                  </div>
                )}
              </div>
            )}
            {filteredAspectsContent}
          </>
        )}
      </TabsContent>

      {dataContent && (
        <TabsContent value="data" className="mt-0">
          {dataContent}
        </TabsContent>
      )}

      {interpretationContent && enabled && (
        <TabsContent value="interpretation" className="mt-0">
          {interpretationContent}
        </TabsContent>
      )}
    </>
  )
}

export function ChartTabs({
  chartContent,
  aspectsContent,
  gridContent,
  dataContent,
  interpretationContent,
  defaultTab = 'chart',
  aspects,
  activePoints,
  aspectFilterType,
  primaryFilterLabel,
  secondaryFilterLabel,
}: ChartTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <div className="flex justify-center mb-6">
        <ChartTabsList hasData={!!dataContent} hasInterpretation={!!interpretationContent} />
      </div>
      <ChartTabContents
        chartContent={chartContent}
        aspectsContent={aspectsContent}
        gridContent={gridContent}
        dataContent={dataContent}
        interpretationContent={interpretationContent}
        aspects={aspects}
        activePoints={activePoints}
        aspectFilterType={aspectFilterType}
        primaryFilterLabel={primaryFilterLabel}
        secondaryFilterLabel={secondaryFilterLabel}
      />
    </Tabs>
  )
}
