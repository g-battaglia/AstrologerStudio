'use server'

import { getSubjectById } from '@/actions/subjects'
import {
  getNatalChart,
  getTransitChart,
  getSynastryChart,
  getCompositeChart,
  getSolarReturnChart,
  getLunarReturnChart,
} from '@/actions/astrology'
import type { SavedChartParams, ChartLocation } from '@/types/saved-chart-params'
import type { ChartResponse } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import { logger } from '@/lib/logging/server'

/**
 * Result type for fetching saved chart data
 */
export type SavedChartDataResult =
  | {
      success: true
      chartType: string
      data: ChartResponse
      subject1Data?: ChartResponse
      subject2Data?: ChartResponse
      natalData?: ChartResponse
      transitData?: ChartResponse
    }
  | {
      success: false
      error: string
    }

/**
 * Fetches fresh chart data based on saved parameters
 * @param params - The saved chart parameters
 * @param theme - Optional theme override ('dark' | 'classic')
 */
export async function getSavedChartData(
  params: SavedChartParams,
  theme?: 'dark' | 'classic',
): Promise<SavedChartDataResult> {
  const chartOptions = theme ? { theme } : undefined

  try {
    switch (params.type) {
      case 'natal': {
        const subject = await getSubjectById(params.subjectId)
        if (!subject) {
          return { success: false, error: 'Subject not found. It may have been deleted.' }
        }
        const data = await getNatalChart(subject, chartOptions)
        return { success: true, chartType: 'natal', data }
      }

      case 'transit': {
        const subject = await getSubjectById(params.subjectId)
        if (!subject) {
          return { success: false, error: 'Subject not found. It may have been deleted.' }
        }

        const transitSubject: Subject = {
          id: 'transit',
          name: 'Transit',
          birth_datetime: params.transitDate,
          city: params.transitLocation.city,
          nation: params.transitLocation.nation,
          latitude: params.transitLocation.latitude,
          longitude: params.transitLocation.longitude,
          timezone: params.transitLocation.timezone,
          ownerId: subject.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const [mainData, natalData, transitData] = await Promise.all([
          getTransitChart(subject, transitSubject, chartOptions),
          getNatalChart(subject, chartOptions),
          getNatalChart(transitSubject, chartOptions),
        ])

        return {
          success: true,
          chartType: 'transit',
          data: mainData,
          natalData,
          transitData,
        }
      }

      case 'synastry': {
        const [subject1, subject2] = await Promise.all([
          getSubjectById(params.subject1Id),
          getSubjectById(params.subject2Id),
        ])

        if (!subject1 || !subject2) {
          return { success: false, error: 'One or both subjects not found. They may have been deleted.' }
        }

        const [mainData, s1Data, s2Data] = await Promise.all([
          getSynastryChart(subject1, subject2, chartOptions),
          getNatalChart(subject1, chartOptions),
          getNatalChart(subject2, chartOptions),
        ])

        return {
          success: true,
          chartType: 'synastry',
          data: mainData,
          subject1Data: s1Data,
          subject2Data: s2Data,
        }
      }

      case 'composite': {
        const [subject1, subject2] = await Promise.all([
          getSubjectById(params.subject1Id),
          getSubjectById(params.subject2Id),
        ])

        if (!subject1 || !subject2) {
          return { success: false, error: 'One or both subjects not found. They may have been deleted.' }
        }

        const data = await getCompositeChart(subject1, subject2, chartOptions)
        return { success: true, chartType: 'composite', data }
      }

      case 'solar-return': {
        const subject = await getSubjectById(params.subjectId)
        if (!subject) {
          return { success: false, error: 'Subject not found. It may have been deleted.' }
        }

        const returnLocation: ChartLocation = params.returnLocation || {
          city: subject.city,
          nation: subject.nation,
          latitude: subject.latitude,
          longitude: subject.longitude,
          timezone: subject.timezone,
        }

        const data = await getSolarReturnChart(subject, {
          ...chartOptions,
          year: params.year,
          wheel_type: params.wheelType,
          return_location: returnLocation,
        })

        if (params.wheelType === 'dual' && data.chart_data.first_subject && data.chart_data.second_subject) {
          const s1Data = await getNatalChart(subject, chartOptions)
          return { success: true, chartType: 'solar-return', data, subject1Data: s1Data }
        }

        return { success: true, chartType: 'solar-return', data }
      }

      case 'lunar-return': {
        const subject = await getSubjectById(params.subjectId)
        if (!subject) {
          return { success: false, error: 'Subject not found. It may have been deleted.' }
        }

        const returnLocation: ChartLocation = params.returnLocation || {
          city: subject.city,
          nation: subject.nation,
          latitude: subject.latitude,
          longitude: subject.longitude,
          timezone: subject.timezone,
        }

        const data = await getLunarReturnChart(subject, {
          ...chartOptions,
          iso_datetime: params.returnDatetime,
          wheel_type: params.wheelType,
          return_location: returnLocation,
        })

        if (params.wheelType === 'dual' && data.chart_data.first_subject && data.chart_data.second_subject) {
          const s1Data = await getNatalChart(subject, chartOptions)
          return { success: true, chartType: 'lunar-return', data, subject1Data: s1Data }
        }

        return { success: true, chartType: 'lunar-return', data }
      }

      default:
        return { success: false, error: 'Unknown chart type' }
    }
  } catch (error) {
    logger.error('Error fetching saved chart data:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to load chart data' }
  }
}
