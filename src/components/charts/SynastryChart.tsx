'use client'

import { useState, useMemo } from 'react'

import { ChartResponse } from '@/types/astrology'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import AspectsCard from '@/components/AspectsCard'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import { ChartTabContents } from './ChartTabs'
import { useChartLayout } from '@/hooks/useChartLayout'
import { ChartLayoutGrid } from './ChartLayoutGrid'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { generateChartId } from '@/lib/cache/interpretations'

interface SynastryChartProps {
  data: ChartResponse
  subject1Data: ChartResponse
  subject2Data: ChartResponse
  savedChartId?: string
  initialNotes?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** Override chart type for AI interpretation (e.g., 'solar-return', 'lunar-return') */
  chartTypeOverride?: string
  subject1DateLabel?: string
  subject2DateLabel?: string
  /** If true, shows a warning that chart data has changed since AI was generated */
  isDataStale?: boolean
  /** Label describing what the stale notes were generated for */
  staleDataLabel?: string
}

const LEFT_COLUMN_ID = 'synastry-left-column'
const RIGHT_COLUMN_ID = 'synastry-right-column'

const DEFAULT_LEFT_ITEMS = ['subject1-details-card', 'subject1-planets-card']
const DEFAULT_RIGHT_ITEMS = ['subject2-details-card', 'subject2-planets-card', 'synastry-aspects-card']

export function SynastryChart({
  data,
  subject1Data,
  subject2Data,
  savedChartId,
  initialNotes,
  notes: propNotes,
  onNotesChange,
  chartTypeOverride,
  subject1DateLabel,
  subject2DateLabel,
  isDataStale = false,
  staleDataLabel,
}: SynastryChartProps) {
  const { chart_wheel, chart_grid, chart_data } = data
  const [localNotes, setLocalNotes] = useState(initialNotes || '')
  const { generateInterpretation } = useAIGeneration()

  const layout = useChartLayout({
    leftColumnId: LEFT_COLUMN_ID,
    rightColumnId: RIGHT_COLUMN_ID,
    defaultLeftItems: DEFAULT_LEFT_ITEMS,
    defaultRightItems: DEFAULT_RIGHT_ITEMS,
  })

  const notes = propNotes !== undefined ? propNotes : localNotes
  const handleNotesChange = onNotesChange || setLocalNotes

  // Generate unique chartId for IndexedDB caching
  const chartId = useMemo(() => {
    const chartType = chartTypeOverride || 'synastry'
    const subjectName1 = subject1Data.chart_data.subject.name
    const subjectName2 = subject2Data.chart_data.subject.name
    const subjectDate1 = subject1Data.chart_data.subject.iso_formatted_utc_datetime || ''
    const subjectDate2 = subject2Data.chart_data.subject.iso_formatted_utc_datetime || ''
    return generateChartId(chartType, subjectName1, subjectDate1, subjectName2, subjectDate2)
  }, [
    chartTypeOverride,
    subject1Data.chart_data.subject.name,
    subject1Data.chart_data.subject.iso_formatted_utc_datetime,
    subject2Data.chart_data.subject.name,
    subject2Data.chart_data.subject.iso_formatted_utc_datetime,
  ])

  // Fallback to 'chart' if 'chart_wheel' is missing
  const mainChart = chart_wheel || data.chart

  const isReturnChart = chartTypeOverride?.includes('return') || false

  const renderCard = (id: string) => {
    switch (id) {
      case 'subject1-details-card':
        return (
          <SubjectDetailsCard
            id={id}
            subject={subject1Data.chart_data}
            className="h-fit w-full"
            dateLabel={subject1DateLabel}
          />
        )
      case 'subject1-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={subject1Data.chart_data.subject}
            className="h-fit w-full"
            title={`${subject1Data.chart_data.subject.name} Points`}
          />
        )
      case 'subject2-details-card':
        return (
          <SubjectDetailsCard
            id={id}
            subject={subject2Data.chart_data}
            className="h-fit w-full"
            dateLabel={subject2DateLabel}
            title={
              chartTypeOverride === 'solar-return'
                ? 'Solar Return'
                : chartTypeOverride === 'lunar-return'
                  ? 'Lunar Return'
                  : undefined
            }
          />
        )
      case 'subject2-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={subject2Data.chart_data.subject}
            className="h-fit w-full"
            projectedPoints={chart_data.house_comparison?.second_points_in_first_houses}
            title={
              chartTypeOverride === 'solar-return'
                ? 'Solar Return Points'
                : chartTypeOverride === 'lunar-return'
                  ? 'Lunar Return Points'
                  : `${subject2Data.chart_data.subject.name} Points`
            }
          />
        )
      case 'natal-houses-card':
        return <NatalHousesPositionsCard id={id} subject={chart_data.subject} className="h-fit w-full" />
      case 'aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      case 'synastry-aspects-card':
        return chart_grid ? (
          <AspectsCard
            id={id}
            html={chart_grid}
            className="w-full"
            rowLabel={isReturnChart ? 'Natal' : subject1Data.chart_data.subject.name}
            colLabel={isReturnChart ? 'Return' : subject2Data.chart_data.subject.name}
          />
        ) : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (
    onStreamUpdate?: (text: string) => void,
    signal?: AbortSignal,
    relationshipType?: string,
  ) => {
    const chartType = chartTypeOverride || 'synastry'
    return generateInterpretation(
      {
        chartData: {
          ...data.chart_data,
          first_subject: data.chart_data.first_subject || subject1Data.chart_data.subject,
          second_subject: data.chart_data.second_subject || subject2Data.chart_data.subject,
        },
        chartType,
        relationshipType,
      },
      onStreamUpdate,
      signal,
    )
  }

  const chartContent = (
    <ChartLayoutGrid
      layout={layout}
      leftColumnId={LEFT_COLUMN_ID}
      rightColumnId={RIGHT_COLUMN_ID}
      mainChart={mainChart}
      renderCard={renderCard}
    />
  )

  const aspectsContent = (
    <AspectTable
      aspects={chart_data.aspects}
      className="mx-auto w-full max-w-8xl"
      p1Label={isReturnChart ? 'Natal' : subject1Data.chart_data.subject.name}
      p2Label={isReturnChart ? 'Return' : subject2Data.chart_data.subject.name}
      hideMovement={!isReturnChart}
    />
  )

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView
        data={data}
        secondaryData={subject2Data}
        primaryLabel={isReturnChart ? 'Natal' : subject1Data.chart_data.subject.name}
        secondaryLabel={isReturnChart ? 'Return' : subject2Data.chart_data.subject.name}
        chartType={chartTypeOverride || 'synastry'}
      />
    </div>
  )

  const notesContent = (
    <NotesPanel
      savedChartId={savedChartId}
      initialNotes={initialNotes}
      notes={notes}
      onNotesChange={handleNotesChange}
      onGenerateAI={handleGenerateAI}
      isDataStale={isDataStale}
      staleDataLabel={staleDataLabel}
      showRelationshipSelector={!chartTypeOverride || chartTypeOverride === 'synastry'}
      chartId={chartId}
    />
  )

  const gridContent = (
    <AspectGrid
      aspects={chart_data.aspects}
      type="double"
      className="mx-auto w-full max-w-8xl"
      activePoints={chart_data.active_points}
      rowLabel={isReturnChart ? 'Natal' : subject1Data.chart_data.subject.name}
      colLabel={isReturnChart ? 'Return' : subject2Data.chart_data.subject.name}
      rowSubject={subject1Data.chart_data.subject}
      colSubject={subject2Data.chart_data.subject}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <ChartTabContents
        chartContent={chartContent}
        aspectsContent={aspectsContent}
        gridContent={gridContent}
        dataContent={dataContent}
        interpretationContent={notesContent}
        aspects={chart_data.aspects}
        activePoints={chart_data.active_points}
        aspectFilterType="double"
        primaryFilterLabel={isReturnChart ? 'Natal Planets' : `${subject1Data.chart_data.subject.name} Planets`}
        secondaryFilterLabel={isReturnChart ? 'Return Planets' : `${subject2Data.chart_data.subject.name} Planets`}
      />
    </div>
  )
}
