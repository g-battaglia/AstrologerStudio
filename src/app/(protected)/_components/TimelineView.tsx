'use client'

import { useState, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { TimeRange, TimeRangeSelector } from '@/components/TimeRangeSelector'
import { TimelineEventTable } from '@/components/TimelineEventTable'
import { RelocationDialog } from './RelocationDialog'
import { MultiSelectFilter, type FilterOption } from '@/components/MultiSelectFilter'
import type { EnrichedSubjectModel, SubjectModel, ChartRequestOptions } from '@/types/astrology'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import { ASPECT_SYMBOLS } from '@/lib/astrology/aspects'
import { getCelestialPointIndex, isChartAngle, PLANET_ICONS } from '@/lib/astrology/celestial-points'
import { useTransitData } from '@/hooks/useTransitData'
import { clearTransitCache } from '@/lib/cache/transits'
// import { Button } from '@/components/ui/button'
// import { RefreshCw } from 'lucide-react'
import { StartDatePicker } from '@/components/StartDatePicker'
import { format } from 'date-fns'
import { clientLogger } from '@/lib/logging/client'

import type { ChartPreferencesData } from '@/actions/preferences'

interface TimelineViewProps {
  // transitData prop is removed, we fetch internally now
  natalSubject: EnrichedSubjectModel
  currentTimeRange: TimeRange
  subjectId: string
  preferences: ChartPreferencesData | null
  initialStartingDate?: Date
}

const getCelestialOrderIndex = getCelestialPointIndex

// Helper to format aspect names for display
function formatAspectName(apiName: string): string {
  return apiName.charAt(0).toUpperCase() + apiName.slice(1)
}

export function TimelineView({
  natalSubject,
  currentTimeRange,
  subjectId,
  preferences,
  initialStartingDate,
}: TimelineViewProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [selectedTransitPlanets, setSelectedTransitPlanets] = useState<string[]>(() => {
    // Initial state: all
    return preferences?.active_points || []
  })

  const [selectedNatalPlanets, setSelectedNatalPlanets] = useState<string[]>(() => {
    // Initial state: all
    return preferences?.active_points || []
  })

  const [selectedAspects, setSelectedAspects] = useState<string[]>(() => {
    // Initial state: all
    return preferences?.active_aspects?.map((a) => a.name) || []
  })

  const [customLocation, setCustomLocation] = useState<{
    city: string
    nation: string
    latitude: number
    longitude: number
    timezone: string
  } | null>(null)

  /* -------------------------------------------------------------------------
   * RESTORED LOGIC START
   * ------------------------------------------------------------------------- */
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [_isRefreshing, setIsRefreshing] = useState(false)

  // Generate planet options from user preferences
  const allPlanetOptions = useMemo<FilterOption[]>(() => {
    if (!preferences?.active_points) {
      return []
    }

    // Filter out chart angles (Ascendant, MC, Descendant, IC) - not relevant for transits
    const filteredPoints = preferences.active_points.filter((point) => !isChartAngle(point))

    const sortedPoints = [...filteredPoints].sort((a, b) => getCelestialOrderIndex(a) - getCelestialOrderIndex(b))

    return sortedPoints.map((point) => ({
      value: point,
      label: formatPlanetName(point),
      icon: PLANET_ICONS[point] || '•',
    }))
  }, [preferences])

  // Transit planets options (same as natal now)
  const transitPlanetOptions = allPlanetOptions

  // Natal planets include everything
  const natalPlanetOptions = allPlanetOptions

  // Generate aspect options from user preferences
  const aspectOptions = useMemo<FilterOption[]>(() => {
    if (!preferences?.active_aspects || preferences.active_aspects.length === 0) {
      return []
    }

    return preferences.active_aspects.map((aspect) => {
      const key = aspect.name.toLowerCase()
      return {
        value: aspect.name,
        label: formatAspectName(aspect.name),
        icon: ASPECT_SYMBOLS[key] || '•',
      }
    })
  }, [preferences])

  // Calculate Date Range based on currentTimeRange and optional starting date
  const { startDate, endDate } = useMemo(() => {
    // Use initialStartingDate if provided, otherwise use current date
    const start = initialStartingDate ? new Date(initialStartingDate) : new Date()
    const end = new Date(start)

    switch (currentTimeRange) {
      case 'week':
        end.setDate(start.getDate() + 7)
        break
      case 'month':
        end.setMonth(start.getMonth() + 1)
        break
      case 'year':
        end.setFullYear(start.getFullYear() + 1)
        break
      default:
        end.setDate(start.getDate() + 7)
    }
    return { startDate: start, endDate: end }
  }, [currentTimeRange, initialStartingDate])

  // Clean subject for API
  const cleanSubject: SubjectModel = useMemo(() => {
    // Determine preferences or defaults
    const zodiacType = preferences?.default_zodiac_system || natalSubject.zodiac_type || 'Tropical'
    // Only set sidereal mode if zodiac type is Sidereal, and prefer config over subject
    const siderealMode =
      zodiacType === 'Sidereal' ? preferences?.default_sidereal_mode || natalSubject.sidereal_mode : undefined

    // Base subject data
    const baseSubject = {
      name: natalSubject.name,
      year: natalSubject.year,
      month: natalSubject.month,
      day: natalSubject.day,
      hour: natalSubject.hour,
      minute: natalSubject.minute,
      second: natalSubject.second || 0,
      city: natalSubject.city,
      nation: natalSubject.nation,
      latitude: natalSubject.latitude ?? natalSubject.lat,
      longitude: natalSubject.longitude ?? natalSubject.lng,
      timezone: natalSubject.timezone ?? natalSubject.tz_str,
    }

    // Override with custom location if set
    if (customLocation) {
      baseSubject.city = customLocation.city
      baseSubject.nation = customLocation.nation
      baseSubject.latitude = customLocation.latitude
      baseSubject.longitude = customLocation.longitude
      baseSubject.timezone = customLocation.timezone
    }

    return {
      ...baseSubject,
      // Apply values directly (no mapping needed as preferences now store API codes)
      zodiac_type: zodiacType,
      sidereal_mode: siderealMode,
      // Use preferences or default to Placidus ('P') - do NOT fall back to subject data
      houses_system_identifier: preferences?.house_system || 'P',
      // Use preferences or default to Apparent Geocentric - do NOT fall back to subject data
      perspective_type: preferences?.perspective_type || 'Apparent Geocentric',
    }
  }, [natalSubject, preferences, customLocation])

  // Prepare chart options from preferences (memoized to prevent infinite loops)
  // For timeline, exclude house axes from active_points (they change constantly for transits)
  const chartOptions = useMemo<ChartRequestOptions | undefined>(() => {
    if (!preferences) return undefined

    const axes = ['Ascendant', 'Medium_Coeli', 'Descendant', 'Imum_Coeli']
    const activePointsWithoutAxes = preferences.active_points.filter((point) => !axes.includes(point))

    return {
      active_points: activePointsWithoutAxes,
      active_aspects: preferences.active_aspects,
      distribution_method: preferences.distribution_method as ChartRequestOptions['distribution_method'],
      custom_distribution_weights:
        preferences.custom_distribution_weights && Object.keys(preferences.custom_distribution_weights).length > 0
          ? preferences.custom_distribution_weights
          : undefined,
    }
  }, [preferences])

  const {
    data: transitData,
    isLoading,
    progress,
  } = useTransitData({
    subjectId,
    natalSubject: cleanSubject,
    startDate,
    endDate,
    refreshTrigger,
    chartOptions,
  })

  const handleRangeChange = (range: TimeRange) => {
    const params = new URLSearchParams(searchParams)
    params.set('range', range)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleStartDateChange = (date: Date | undefined) => {
    const params = new URLSearchParams(searchParams)
    if (date) {
      params.set('from', format(date, 'yyyy-MM-dd'))
    } else {
      params.delete('from')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const _handleRefreshCache = async () => {
    setIsRefreshing(true)
    try {
      await clearTransitCache()
      setRefreshTrigger((prev) => prev + 1)
    } catch (error) {
      clientLogger.error('Failed to clear cache:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  /* -------------------------------------------------------------------------
   * RESTORED LOGIC END
   * ------------------------------------------------------------------------- */

  return (
    <div className="space-y-4 p-0 md:p-2">
      {/* Header with Subject Info and Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold truncate">
            Timeline: <span className="text-primary">{natalSubject.name}</span>
          </h1>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>
              {String(natalSubject.day).padStart(2, '0')}/{String(natalSubject.month).padStart(2, '0')}/
              {natalSubject.year} {String(natalSubject.hour).padStart(2, '0')}:
              {String(natalSubject.minute).padStart(2, '0')}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className={customLocation ? 'text-primary font-medium' : ''}>
              {cleanSubject.city}, {cleanSubject.nation}
            </span>
            {customLocation && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Relocated</span>
            )}
          </p>
        </div>
        {/* Actions in header */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isLoading && progress.total > 0 && (
            <div className="text-sm text-muted-foreground animate-pulse whitespace-nowrap">
              {Math.round((progress.loaded / progress.total) * 100)}%
            </div>
          )}
          <StartDatePicker value={initialStartingDate} onChange={handleStartDateChange} />
          <RelocationDialog currentLocation={customLocation} onLocationChange={setCustomLocation} />
        </div>
      </div>

      <TimelineEventTable
        transitData={transitData}
        subjectId={subjectId}
        selectedTransitPlanets={selectedTransitPlanets}
        selectedNatalPlanets={selectedNatalPlanets}
        selectedAspects={selectedAspects}
        natalSubject={natalSubject}
        filters={
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <MultiSelectFilter
              title="Transit Planets"
              shortTitle="Transit"
              options={transitPlanetOptions}
              selected={selectedTransitPlanets}
              onChange={setSelectedTransitPlanets}
              className="w-full sm:w-[140px]"
            />
            <MultiSelectFilter
              title="Natal Planets"
              shortTitle="Natal"
              options={natalPlanetOptions}
              selected={selectedNatalPlanets}
              onChange={setSelectedNatalPlanets}
              className="w-full sm:w-[140px]"
            />
            <MultiSelectFilter
              title="Aspects"
              options={aspectOptions}
              selected={selectedAspects}
              onChange={setSelectedAspects}
              className="w-full sm:w-[140px]"
            />
            <TimeRangeSelector value={currentTimeRange} onChange={handleRangeChange} className="w-full sm:w-[140px]" />
          </div>
        }
      />
    </div>
  )
}
