import { getSubjectAction, getTransitChartDataAction } from '@/app/actions/astrology'
import { EphemerisArraySchema, type EphemerisArray, type Ephemeris } from '@/types/ephemeris'
import type {
  SubjectModel,
  Point,
  EnrichedSubjectModel,
  Aspect,
  ChartRequestOptions,
  HouseComparisonPoint,
} from '@/types/astrology'
import { getCachedEphemeris, setCachedEphemeris } from '@/lib/cache/ephemeris'
import { logger } from '@/lib/logging/server'

export interface FetchOptions<T = Ephemeris[] | TransitDayData[]> {
  token?: string | null
  signal?: AbortSignal
  startDate?: Date
  endDate?: Date
  onProgress?: (data: T, progress: { current: number; total: number }) => void
  skipCache?: boolean
  chartOptions?: ChartRequestOptions
}

export interface TransitDayData {
  date: string
  transitSubject: EnrichedSubjectModel
  aspects: Aspect[]
  houseComparison: {
    first_points_in_second_houses: HouseComparisonPoint[]
    second_points_in_first_houses: HouseComparisonPoint[]
  }
}

/**
 * Fetch ephemeris data for a date range using the Astrologer API
 *
 * @remarks
 * The API doesn't have a dedicated ephemeris endpoint, so we generate
 * ephemeris by calling the /subject endpoint for each day in the range
 *
 * @param opts - Fetch options including date range and active points
 * @returns Array of ephemeris data (planetary positions for each day)
 */
export async function fetchEphemeris(opts: FetchOptions<EphemerisArray> = {}): Promise<EphemerisArray> {
  // Default to next 365 days from today
  const startDate = opts.startDate || new Date()
  const endDate = opts.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  // Check cache first (unless skipCache is true)
  if (!opts.skipCache) {
    const cached = await getCachedEphemeris(startDate, endDate)
    if (cached) {
      logger.debug('Returning cached ephemeris data')

      // Simulate progressive loading with cached data for better UX
      if (opts.onProgress) {
        const chunkSize = 10 // Show 10 days at a time
        for (let i = 0; i < cached.length; i += chunkSize) {
          if (opts.signal?.aborted) break

          const chunk = cached.slice(0, Math.min(i + chunkSize, cached.length))
          opts.onProgress(chunk, {
            current: chunk.length,
            total: cached.length,
          })

          // Small delay to make the progressive loading visible
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      return cached
    }
  }

  const ephemerisData: Ephemeris[] = []
  const currentDate = new Date(startDate)

  // Generate subjects for each day in the range
  // Sample daily (365 calls per year)
  const sampleIntervalDays = 1

  // Calculate total number of days to fetch
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * sampleIntervalDays))

  while (currentDate <= endDate) {
    if (opts.signal?.aborted) {
      throw new Error('Request aborted')
    }

    // Create a subject for this specific date/time (noon UTC)
    const subject: SubjectModel = {
      name: 'Ephemeris',
      year: currentDate.getUTCFullYear(),
      month: currentDate.getUTCMonth() + 1,
      day: currentDate.getUTCDate(),
      hour: 12,
      minute: 0,
      second: 0,
      city: 'Greenwich',
      nation: 'GB',
      timezone: 'UTC',
      longitude: 0,
      latitude: 51.4778,
    }

    try {
      // Fetch astrological data for this date, passing active_points if provided
      const response = await getSubjectAction(subject, {
        active_points: opts.chartOptions?.active_points,
      })

      // Build planets array from individual properties
      const planets: Point[] = []
      const subj = response.subject

      // Core planets
      if (subj.sun) planets.push(subj.sun)
      if (subj.moon) planets.push(subj.moon)
      if (subj.mercury) planets.push(subj.mercury)
      if (subj.venus) planets.push(subj.venus)
      if (subj.mars) planets.push(subj.mars)
      if (subj.jupiter) planets.push(subj.jupiter)
      if (subj.saturn) planets.push(subj.saturn)
      if (subj.uranus) planets.push(subj.uranus)
      if (subj.neptune) planets.push(subj.neptune)
      if (subj.pluto) planets.push(subj.pluto)

      // Lunar nodes
      if (subj.mean_north_lunar_node) planets.push({ ...subj.mean_north_lunar_node, name: 'Mean_North_Lunar_Node' })
      if (subj.true_north_lunar_node) planets.push({ ...subj.true_north_lunar_node, name: 'True_North_Lunar_Node' })
      if (subj.mean_south_lunar_node) planets.push({ ...subj.mean_south_lunar_node, name: 'Mean_South_Lunar_Node' })
      if (subj.true_south_lunar_node) planets.push({ ...subj.true_south_lunar_node, name: 'True_South_Lunar_Node' })

      // Centaurs & minor bodies
      if (subj.chiron) planets.push({ ...subj.chiron, name: 'Chiron' })
      if (subj.pholus) planets.push({ ...subj.pholus, name: 'Pholus' })

      // Lilith
      if (subj.mean_lilith) planets.push({ ...subj.mean_lilith, name: 'Mean_Lilith' })
      if (subj.true_lilith) planets.push({ ...subj.true_lilith, name: 'True_Lilith' })

      // Earth
      if (subj.earth) planets.push({ ...subj.earth, name: 'Earth' })

      // Asteroids
      if (subj.ceres) planets.push({ ...subj.ceres, name: 'Ceres' })
      if (subj.pallas) planets.push({ ...subj.pallas, name: 'Pallas' })
      if (subj.juno) planets.push({ ...subj.juno, name: 'Juno' })
      if (subj.vesta) planets.push({ ...subj.vesta, name: 'Vesta' })

      // Dwarf planets
      if (subj.eris) planets.push({ ...subj.eris, name: 'Eris' })
      if (subj.sedna) planets.push({ ...subj.sedna, name: 'Sedna' })
      if (subj.haumea) planets.push({ ...subj.haumea, name: 'Haumea' })
      if (subj.makemake) planets.push({ ...subj.makemake, name: 'Makemake' })
      if (subj.ixion) planets.push({ ...subj.ixion, name: 'Ixion' })
      if (subj.orcus) planets.push({ ...subj.orcus, name: 'Orcus' })
      if (subj.quaoar) planets.push({ ...subj.quaoar, name: 'Quaoar' })

      // Fixed stars
      if (subj.regulus) planets.push({ ...subj.regulus, name: 'Regulus' })
      if (subj.spica) planets.push({ ...subj.spica, name: 'Spica' })

      // Axes
      if (subj.ascendant) planets.push({ ...subj.ascendant, name: 'Ascendant' })
      if (subj.medium_coeli) planets.push({ ...subj.medium_coeli, name: 'Medium_Coeli' })
      if (subj.descendant) planets.push({ ...subj.descendant, name: 'Descendant' })
      if (subj.imum_coeli) planets.push({ ...subj.imum_coeli, name: 'Imum_Coeli' })

      // Special points
      if (subj.vertex) planets.push({ ...subj.vertex, name: 'Vertex' })
      if (subj.anti_vertex) planets.push({ ...subj.anti_vertex, name: 'Anti_Vertex' })

      // Arabic parts
      if (subj.pars_fortunae) planets.push({ ...subj.pars_fortunae, name: 'Pars_Fortunae' })
      if (subj.pars_spiritus) planets.push({ ...subj.pars_spiritus, name: 'Pars_Spiritus' })
      if (subj.pars_amoris) planets.push({ ...subj.pars_amoris, name: 'Pars_Amoris' })
      if (subj.pars_fidei) planets.push({ ...subj.pars_fidei, name: 'Pars_Fidei' })

      // Build houses array from individual properties
      const houses: Point[] = []
      if (subj.first_house) houses.push(subj.first_house)
      if (subj.second_house) houses.push(subj.second_house)
      if (subj.third_house) houses.push(subj.third_house)
      if (subj.fourth_house) houses.push(subj.fourth_house)
      if (subj.fifth_house) houses.push(subj.fifth_house)
      if (subj.sixth_house) houses.push(subj.sixth_house)
      if (subj.seventh_house) houses.push(subj.seventh_house)
      if (subj.eighth_house) houses.push(subj.eighth_house)
      if (subj.ninth_house) houses.push(subj.ninth_house)
      if (subj.tenth_house) houses.push(subj.tenth_house)
      if (subj.eleventh_house) houses.push(subj.eleventh_house)
      if (subj.twelfth_house) houses.push(subj.twelfth_house)

      // Transform to ephemeris format
      const ephemeris: Ephemeris = {
        date: currentDate.toISOString(),
        planets: planets.map((p: Point) => ({
          name: p.name,
          quality: p.quality,
          element: p.element,
          sign: p.sign,
          sign_num: p.sign_num,
          position: p.position,
          abs_pos: p.abs_pos,
          emoji: p.emoji,
          point_type: p.point_type,
          house: p.house || '',
          retrograde: p.retrograde,
        })),
        houses: houses.map((h: Point) => ({
          name: h.name,
          quality: h.quality,
          element: h.element,
          sign: h.sign,
          sign_num: h.sign_num,
          position: h.position,
          abs_pos: h.abs_pos,
          emoji: h.emoji,
          point_type: h.point_type,
          house: '',
          retrograde: false,
        })),
      }

      ephemerisData.push(ephemeris)

      // Call progress callback with current data and progress info
      if (opts.onProgress) {
        opts.onProgress([...ephemerisData], {
          current: ephemerisData.length,
          total: totalDays,
        })
      }
    } catch (error) {
      logger.error(`Failed to fetch ephemeris for ${currentDate.toISOString()}:`, error)
      // Continue with next date even if one fails
    }

    // Move to next sample interval
    currentDate.setDate(currentDate.getDate() + sampleIntervalDays)
  }

  if (ephemerisData.length === 0) {
    throw new Error('No ephemeris data could be fetched')
  }

  // Validate the generated data
  const parsed = EphemerisArraySchema.safeParse(ephemerisData)
  if (!parsed.success) {
    logger.error('Generated ephemeris validation error:', parsed.error.format())
    throw new Error('Invalid generated ephemeris data')
  }

  // Store in cache for future use
  await setCachedEphemeris(startDate, endDate, parsed.data)

  return parsed.data
}

/**
 * Fetch transit data for a range of dates, including aspects to a natal chart
 */
export async function fetchTransitRange(
  natalSubject: SubjectModel,
  opts: FetchOptions<TransitDayData[]> = {},
): Promise<TransitDayData[]> {
  const startDate = opts.startDate || new Date()
  const endDate = opts.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 1 week

  const transitData: TransitDayData[] = []
  const currentDate = new Date(startDate)
  const sampleIntervalDays = 1
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * sampleIntervalDays))

  while (currentDate <= endDate) {
    if (opts.signal?.aborted) {
      throw new Error('Request aborted')
    }

    const transitSubject: SubjectModel = {
      name: 'Transit',
      year: currentDate.getUTCFullYear(),
      month: currentDate.getUTCMonth() + 1,
      day: currentDate.getUTCDate(),
      hour: 12,
      minute: 0,
      second: 0,
      city: natalSubject.city, // Use natal location for transits usually, or current user location
      nation: natalSubject.nation,
      timezone: natalSubject.timezone || 'UTC',
      longitude: natalSubject.longitude || 0,
      latitude: natalSubject.latitude || 0,
    }

    try {
      // Sanitize subjects to include ONLY basic fields
      // getTransitChartData doesn't accept config fields like zodiac_type, houses_system_identifier, etc.
      const cleanNatalSubject: SubjectModel = {
        name: natalSubject.name,
        year: natalSubject.year,
        month: natalSubject.month,
        day: natalSubject.day,
        hour: natalSubject.hour,
        minute: natalSubject.minute,
        second: natalSubject.second || 0,
        city: natalSubject.city,
        nation: natalSubject.nation,
        timezone: natalSubject.timezone,
        longitude: natalSubject.longitude,
        latitude: natalSubject.latitude,
      }

      const cleanTransitSubject: SubjectModel = {
        name: transitSubject.name,
        year: transitSubject.year,
        month: transitSubject.month,
        day: transitSubject.day,
        hour: transitSubject.hour,
        minute: transitSubject.minute,
        second: transitSubject.second || 0,
        city: transitSubject.city,
        nation: transitSubject.nation,
        timezone: transitSubject.timezone,
        longitude: transitSubject.longitude,
        latitude: transitSubject.latitude,
      }

      // Use getTransitChartData to get aspects calculated by API (lighter than full chart)
      const computationOptions = opts.chartOptions
        ? {
            active_points: opts.chartOptions.active_points,
            active_aspects: opts.chartOptions.active_aspects,
            distribution_method: opts.chartOptions.distribution_method,
            custom_distribution_weights: opts.chartOptions.custom_distribution_weights,
          }
        : undefined

      const response = await getTransitChartDataAction(cleanNatalSubject, cleanTransitSubject, computationOptions)

      if (response.status === 'OK' && response.chart_data.second_subject) {
        transitData.push({
          date: currentDate.toISOString(),
          transitSubject: response.chart_data.second_subject,
          aspects: response.chart_data.aspects || [],
          houseComparison: response.chart_data.house_comparison || {
            first_points_in_second_houses: [],
            second_points_in_first_houses: [],
          },
        })
      }

      if (opts.onProgress) {
        opts.onProgress([...transitData], {
          current: transitData.length,
          total: totalDays,
        })
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      logger.error(`Failed to fetch transit for ${currentDate.toISOString()}:`, error)
      // Do not throw, continue to next date so we get partial data at least
    }

    currentDate.setDate(currentDate.getDate() + sampleIntervalDays)
  }

  return transitData
}
