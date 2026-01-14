/**
 * NOTE: DODO PAYMENTS - This page requires paid plan for chart access
 */
import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import { getSubjectById } from '@/actions/subjects'
import { getNatalChart } from '@/actions/astrology'
import { getChartPreferences } from '@/actions/preferences'
import { TimelineView } from '@/app/(protected)/_components/TimelineView'
import { getSessionWithSubscription } from '@/lib/subscription'
import { canAccessChartType } from '@/lib/subscription/plan-limits'
import type { TimeRange } from '@/components/TimeRangeSelector'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ range?: string; from?: string }>
}

export default async function Page({ params, searchParams }: PageProps) {
  // DODO PAYMENTS: Check chart access for free plan
  const session = await getSessionWithSubscription()
  if (!session || !canAccessChartType(session.subscriptionPlan, 'timeline')) {
    redirect('/pricing')
  }

  const { id } = await params
  const { range, from } = await searchParams

  // Parse starting date from query param (format: YYYY-MM-DD)
  const startingDate = from ? new Date(from) : undefined
  const validStartingDate = startingDate && !isNaN(startingDate.getTime()) ? startingDate : undefined

  // Validate timeRange - only week, month, year allowed
  const validRanges: TimeRange[] = ['week', 'month', 'year']
  const timeRange: TimeRange = validRanges.includes(range as TimeRange) ? (range as TimeRange) : 'week'

  // 1. Fetch Subject
  const subject = await getSubjectById(id)
  if (!subject) {
    notFound()
  }

  // 2. Get Enriched Subject (Natal Chart) for calculations
  const chartResponse = await getNatalChart(subject)
  if (chartResponse.status === 'ERROR' || !chartResponse.chart_data.subject) {
    throw new Error('Failed to calculate natal chart')
  }
  const natalSubject = chartResponse.chart_data.subject

  // 3. Get User Preferences
  const preferences = await getChartPreferences()

  // 4. Render View (Data fetching is now client-side in TimelineView)
  return (
    <Suspense fallback={<div>Loading timeline data...</div>}>
      <TimelineView
        natalSubject={natalSubject}
        currentTimeRange={timeRange}
        subjectId={id}
        preferences={preferences}
        initialStartingDate={validStartingDate}
      />
    </Suspense>
  )
}
