import { Suspense } from 'react'
import { EphemerisView } from '../_components/EphemerisView'
import { getChartPreferences } from '@/actions/preferences'
import type { TimeRange } from '@/components/TimeRangeSelector'

interface PageProps {
  searchParams: Promise<{ range?: string }>
}

export default async function Page({ searchParams }: PageProps) {
  const { range } = await searchParams

  // Validate timeRange - only week, month, year allowed
  const validRanges: TimeRange[] = ['week', 'month', 'year']
  const timeRange: TimeRange = validRanges.includes(range as TimeRange) ? (range as TimeRange) : 'month'

  // Fetch user preferences server-side
  const preferences = await getChartPreferences()

  return (
    <Suspense fallback={<div>Loading ephemeris data...</div>}>
      <EphemerisView preferences={preferences} currentTimeRange={timeRange} />
    </Suspense>
  )
}
