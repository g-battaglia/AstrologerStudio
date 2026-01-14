'use server'

import { astrologerApi } from '@/lib/api/astrologer'
import type { SubjectModel, EnrichedSubjectModel, ChartRequestOptions, ChartResponse } from '@/types/astrology'

/**
 * Server Action to get astrological subject data.
 * This wraps the astrologerApi.getSubject call, ensuring the API key
 * and URL are accessed only on the server.
 */
export async function getSubjectAction(
  subject: SubjectModel,
  options?: Pick<ChartRequestOptions, 'active_points'>,
): Promise<{ status: string; subject: EnrichedSubjectModel }> {
  return astrologerApi.getSubject(subject, options)
}

/**
 * Server Action to get transit chart data (no rendering).
 * This wraps the astrologerApi.getTransitChartData call, ensuring the API key
 * and URL are accessed only on the server.
 */
export async function getTransitChartDataAction(
  natalSubject: SubjectModel,
  transitSubject: SubjectModel,
  options?: Pick<
    ChartRequestOptions,
    'active_points' | 'active_aspects' | 'distribution_method' | 'custom_distribution_weights'
  >,
): Promise<ChartResponse> {
  return astrologerApi.getTransitChartData(natalSubject, transitSubject, options)
}
