'use server'

import { astrologerApi } from '@/lib/api/astrologer'
import { logger } from '@/lib/logging/server'
import type {
  SubjectModel,
  ChartRequestOptions,
  EnrichedSubjectModel,
  Aspect,
  HouseComparisonPoint,
} from '@/types/astrology'

// Define the type here to avoid importing from lib/api/transits.ts which has client-side dependencies
export interface TransitDayData {
  date: string
  transitSubject: EnrichedSubjectModel
  aspects: Aspect[]
  houseComparison: {
    first_points_in_second_houses: HouseComparisonPoint[]
    second_points_in_first_houses: HouseComparisonPoint[]
  }
}

export async function getTransitRange(
  natalSubject: SubjectModel,
  startDate: Date,
  endDate: Date,
  chartOptions?: ChartRequestOptions,
): Promise<TransitDayData[]> {
  const transitData: TransitDayData[] = []
  const currentDate = new Date(startDate)
  const sampleIntervalDays = 1

  // Create array of dates to fetch
  const datesToFetch: Date[] = []
  // Clone dates to avoid reference issues
  const end = new Date(endDate)

  while (currentDate <= end) {
    datesToFetch.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + sampleIntervalDays)
  }

  // Process in chunks to avoid overwhelming the API but faster than serial
  const CHUNK_SIZE = 5
  for (let i = 0; i < datesToFetch.length; i += CHUNK_SIZE) {
    const chunk = datesToFetch.slice(i, i + CHUNK_SIZE)

    const results = await Promise.all(
      chunk.map(async (date) => {
        try {
          const transitSubject: SubjectModel = {
            name: 'Transit',
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            day: date.getUTCDate(),
            hour: 12,
            minute: 0,
            second: 0,
            city: natalSubject.city,
            nation: natalSubject.nation,
            timezone: natalSubject.timezone || 'UTC',
            longitude: natalSubject.longitude || 0,
            latitude: natalSubject.latitude || 0,
          }

          // Sanitize subjects
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

          const computationOptions = chartOptions
            ? {
                active_points: chartOptions.active_points,
                active_aspects: chartOptions.active_aspects,
                distribution_method: chartOptions.distribution_method,
                custom_distribution_weights: chartOptions.custom_distribution_weights,
              }
            : undefined

          const response = await astrologerApi.getTransitChartData(
            cleanNatalSubject,
            cleanTransitSubject,
            computationOptions,
          )

          if (response.status === 'OK' && response.chart_data.second_subject) {
            return {
              date: date.toISOString(),
              transitSubject: response.chart_data.second_subject,
              aspects: response.chart_data.aspects || [],
              houseComparison: response.chart_data.house_comparison || {
                first_points_in_second_houses: [],
                second_points_in_first_houses: [],
              },
            } as TransitDayData
          }
          return null
        } catch (error) {
          logger.error(`Failed to fetch transit for ${date.toISOString()}:`, error)
          return null
        }
      }),
    )

    // Filter out nulls and add to result
    results.forEach((r) => {
      if (r) transitData.push(r)
    })
  }

  return transitData
}
