'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSubjectById } from '@/actions/subjects'
import { getSynastryChart, getNatalChart } from '@/actions/astrology'
import { SynastryChart } from '@/components/charts/SynastryChart'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/ThemeProvider'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { SaveChartButton } from '@/components/SaveChartButton'
import { ExportSynastryPDFDialog } from '@/components/pdf'

interface Props {
  subjectId: string
  partnerId: string
}

export function SynastryChartView({ subjectId, partnerId }: Props) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const [notes, setNotes] = useState('')

  const { data: subject1, isLoading: isLoadingS1 } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubjectById(subjectId),
  })

  const { data: subject2, isLoading: isLoadingS2 } = useQuery({
    queryKey: ['subject', partnerId],
    queryFn: () => getSubjectById(partnerId),
  })

  // Fetch Natal Data for Subject 1
  const { data: s1Data } = useQuery({
    queryKey: ['natal-chart', subjectId, chartTheme],
    queryFn: () => {
      if (!subject1) throw new Error('Subject 1 not found')
      return getNatalChart(subject1, { theme: chartTheme })
    },
    enabled: !!subject1,
  })

  // Fetch Natal Data for Subject 2
  const { data: s2Data } = useQuery({
    queryKey: ['natal-chart', partnerId, chartTheme],
    queryFn: () => {
      if (!subject2) throw new Error('Subject 2 not found')
      return getNatalChart(subject2, { theme: chartTheme })
    },
    enabled: !!subject2,
  })

  const {
    data: chartData,
    isLoading: isLoadingChart,
    isFetching: isFetchingChart,
    error: chartError,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ['synastry-chart', subjectId, partnerId, chartTheme],
    queryFn: () => {
      if (!subject1 || !subject2) throw new Error('Subjects not found')
      return getSynastryChart(subject1, subject2, { theme: chartTheme })
    },
    enabled: !!subject1 && !!subject2,
    placeholderData: (previousData) => previousData,
  })

  if (isLoadingS1 || isLoadingS2) {
    return (
      <div className="space-y-8 p-0 md:p-2">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (!subject1 || !subject2) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-destructive">Subject(s) not found</h2>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <Tabs defaultValue="chart" className="space-y-6 p-0 md:p-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Synastry</h1>
            <p className="text-muted-foreground">
              {subject1.name} &amp; {subject2.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChartTabsList hasData={true} hasInterpretation={isAIGloballyEnabled()} />
          <div className="flex items-center gap-2 ml-auto">
            {chartData && s1Data && s2Data && (
              <SaveChartButton
                chartParams={{
                  type: 'synastry',
                  subject1Id: subjectId,
                  subject2Id: partnerId,
                }}
                chartType="synastry"
                defaultName={`${subject1.name} / ${subject2.name} - Synastry Chart`}
                notes={notes}
              />
            )}
            {chartData && s1Data && s2Data && (
              <ExportSynastryPDFDialog
                chartData={chartData.chart_data}
                subject1ChartData={s1Data.chart_data}
                subject2ChartData={s2Data.chart_data}
                aspects={chartData.chart_data.aspects}
                chartWheelHtml={chartData.chart_wheel}
                notes={notes}
                size="icon"
              />
            )}
          </div>
        </div>
      </div>

      {isLoadingChart && !chartData ? (
        <div className="space-y-8">
          <Skeleton className="h-[500px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : chartError ? (
        <ChartErrorState error={chartError} onRetry={() => refetchChart()} />
      ) : chartData && s1Data && s2Data ? (
        <div className={isFetchingChart ? 'opacity-50 transition-opacity duration-200' : ''}>
          <SynastryChart
            data={chartData}
            subject1Data={s1Data}
            subject2Data={s2Data}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>
      ) : null}
    </Tabs>
  )
}
