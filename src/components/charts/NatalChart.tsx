'use client'

import { useMemo } from 'react'

import { ChartResponse } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import AspectsCard from '@/components/AspectsCard'
import { ChartTabContents } from './ChartTabs'
import { useChartLayout } from '@/hooks/useChartLayout'
import { ChartLayoutGrid } from './ChartLayoutGrid'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { SubjectNotesPanel } from '@/components/SubjectNotesPanel'
import { useAIGeneration } from '@/hooks/useAIGeneration'
import { generateChartId } from '@/lib/cache/interpretations'

interface NatalChartProps {
  data: ChartResponse
  subjectId: string
  /** Subject data for PDF export (needed to regenerate chart with light theme) */
  subject?: Subject
  savedChartId?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** Override chart type for AI interpretation (e.g., 'solar-return', 'lunar-return') */
  chartTypeOverride?: string
  dateLabel?: string
  /** If true, shows a warning that chart data has changed since AI was generated */
  isDataStale?: boolean
  /** Label describing what the stale notes were generated for */
  staleDataLabel?: string
}

const LEFT_COLUMN_ID = 'natal-chart-left-column'
const RIGHT_COLUMN_ID = 'natal-chart-right-column'

const DEFAULT_LEFT_ITEMS = ['subject-details-card', 'natal-planets-card']
const DEFAULT_RIGHT_ITEMS = ['natal-houses-card', 'aspects-card']

export function NatalChart({
  data,
  subjectId,
  notes,
  savedChartId,
  onNotesChange,
  chartTypeOverride,
  dateLabel,
  isDataStale = false,
  staleDataLabel,
}: NatalChartProps) {
  const { chart_wheel, chart_grid, chart, chart_data } = data
  const { generateInterpretation } = useAIGeneration()

  const layout = useChartLayout({
    leftColumnId: LEFT_COLUMN_ID,
    rightColumnId: RIGHT_COLUMN_ID,
    defaultLeftItems: DEFAULT_LEFT_ITEMS,
    defaultRightItems: DEFAULT_RIGHT_ITEMS,
  })

  // In single wheel returns, the data might be in second_subject instead of subject
  const activeSubject = chart_data.subject || chart_data.second_subject

  // Generate unique chartId for IndexedDB caching
  const chartId = useMemo(() => {
    const chartType = chartTypeOverride || 'natal'
    if (!activeSubject) return undefined
    const subjectName = activeSubject.name
    const subjectDate = activeSubject.iso_formatted_utc_datetime || ''
    return generateChartId(chartType, subjectName, subjectDate)
  }, [chartTypeOverride, activeSubject])

  // Fallback to full chart if split chart is not available
  const mainChart = chart_wheel || chart

  const renderCard = (id: string) => {
    switch (id) {
      case 'subject-details-card':
        return (
          <SubjectDetailsCard
            id={id}
            subject={chart_data}
            className="h-fit w-full"
            dateLabel={dateLabel}
            title={
              chartTypeOverride === 'solar-return'
                ? 'Solar Return'
                : chartTypeOverride === 'lunar-return'
                  ? 'Lunar Return'
                  : undefined
            }
          />
        )
      case 'natal-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={activeSubject}
            className="h-fit w-full"
            title={
              chartTypeOverride === 'solar-return'
                ? 'Solar Return Points'
                : chartTypeOverride === 'lunar-return'
                  ? 'Lunar Return Points'
                  : undefined
            }
          />
        )
      case 'natal-houses-card':
        return <NatalHousesPositionsCard id={id} subject={activeSubject} className="h-fit w-full" />
      case 'aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (onStreamUpdate?: (text: string) => void, signal?: AbortSignal) => {
    const chartType = chartTypeOverride || 'natal'
    return generateInterpretation({ chartData: data.chart_data, chartType }, onStreamUpdate, signal)
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

  const aspectsContent = <AspectTable aspects={chart_data.aspects} className="mx-auto w-full max-w-8xl" />

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView data={data} chartType={chartTypeOverride || 'natal'} />
    </div>
  )

  const notesContent =
    notes !== undefined || savedChartId ? (
      <NotesPanel
        savedChartId={savedChartId}
        notes={notes}
        onNotesChange={onNotesChange}
        onGenerateAI={handleGenerateAI}
        isDataStale={isDataStale}
        staleDataLabel={staleDataLabel}
        chartId={chartId}
      />
    ) : (
      <SubjectNotesPanel subjectId={subjectId} onGenerateAI={handleGenerateAI} chartId={chartId} />
    )

  const gridContent = (
    <AspectGrid
      aspects={chart_data.aspects}
      type="single"
      className="mx-auto w-full max-w-8xl"
      activePoints={chart_data.active_points}
      rowSubject={activeSubject}
      colSubject={activeSubject}
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
      />
    </div>
  )
}
