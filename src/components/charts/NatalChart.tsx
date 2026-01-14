'use client'

import { useState, useEffect, useId, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import { ChartResponse } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import ZoomableChart from '@/components/ZoomableChart'
import AspectsCard from '@/components/AspectsCard'
import { ChartTabContents } from './ChartTabs'
import { DraggableColumn } from '@/components/dnd/DraggableColumn'
import { SortableCard } from '@/components/dnd/SortableCard'
import { useUIPreferences } from '@/stores/uiPreferences'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { SubjectNotesPanel } from '@/components/SubjectNotesPanel'
import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import { CHART_TYPE_PROMPTS } from '@/lib/ai/prompts'
import { generateChartId } from '@/lib/cache/interpretations'

interface NatalChartProps {
  data: ChartResponse
  subjectId: string
  /** Subject data for PDF export (needed to regenerate chart with light theme) */
  subject?: Subject
  savedChartId?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** Override chart type for AI interpretation (e.g., 'solar_return', 'lunar_return') */
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
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const { language, getActivePrompt, include_house_comparison } = useAIInterpretation()
  const dndContextId = useId()

  // Generate unique chartId for IndexedDB caching
  const chartId = useMemo(() => {
    const chartType = chartTypeOverride || 'natal'
    const subjectName = data.chart_data.subject.name
    const subjectDate = data.chart_data.subject.iso_formatted_utc_datetime || ''
    return generateChartId(chartType, subjectName, subjectDate)
  }, [chartTypeOverride, data.chart_data.subject.name, data.chart_data.subject.iso_formatted_utc_datetime])

  // Fallback to full chart if split chart is not available
  const mainChart = chart_wheel || chart

  // Initialize or retrieve layout
  // Use nullish coalescing to allow empty columns (when all cards are dragged to one side)
  const leftItems = layout[LEFT_COLUMN_ID] ?? DEFAULT_LEFT_ITEMS
  const rightItems = layout[RIGHT_COLUMN_ID] ?? DEFAULT_RIGHT_ITEMS

  // Initialize layout only if keys don't exist at all (first time setup)
  useEffect(() => {
    if (!(LEFT_COLUMN_ID in layout)) {
      updateLayout(LEFT_COLUMN_ID, DEFAULT_LEFT_ITEMS)
    }
    if (!(RIGHT_COLUMN_ID in layout)) {
      updateLayout(RIGHT_COLUMN_ID, DEFAULT_RIGHT_ITEMS)
    }
  }, [layout, updateLayout])

  const findContainer = (id: string) => {
    if (leftItems.includes(id)) return LEFT_COLUMN_ID
    if (rightItems.includes(id)) return RIGHT_COLUMN_ID
    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const activeContainer = findContainer(activeId)
    const overContainer =
      findContainer(overId) || (overId === LEFT_COLUMN_ID || overId === RIGHT_COLUMN_ID ? overId : null)

    if (activeContainer && overContainer) {
      moveItem(activeId, overId, activeContainer, overContainer)
    }

    setActiveId(null)
  }

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
              chartTypeOverride === 'solar_return'
                ? 'Solar Return'
                : chartTypeOverride === 'lunar_return'
                  ? 'Lunar Return'
                  : undefined
            }
          />
        )
      case 'natal-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={chart_data.subject}
            className="h-fit w-full"
            title={
              chartTypeOverride === 'solar_return'
                ? 'Solar Return Points'
                : chartTypeOverride === 'lunar_return'
                  ? 'Lunar Return Points'
                  : undefined
            }
          />
        )
      case 'natal-houses-card':
        return <NatalHousesPositionsCard id={id} subject={chart_data.subject} className="h-fit w-full" />
      case 'aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (onStreamUpdate?: (text: string) => void, signal?: AbortSignal) => {
    const chartType = chartTypeOverride || 'natal'
    const subjectName = data.chart_data.subject.name
    const subjectDate = data.chart_data.subject.iso_formatted_utc_datetime
    const activePointsKey = [...data.chart_data.active_points].sort().join(',')
    const _chartId = `${chartType}-${subjectName}-${subjectDate}-${activePointsKey}`

    const response = await fetch('/api/ai/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chartData: data.chart_data,
        chartType,
        systemPrompt: getActivePrompt(),
        chartTypePrompt: CHART_TYPE_PROMPTS[chartType] || '',
        language,
        include_house_comparison,
      }),
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate interpretation')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) throw new Error('No response body')

    // Extract debug headers (base64 encoded)
    const debugContextB64 = response.headers.get('X-AI-Context')
    const debugUserPromptB64 = response.headers.get('X-AI-User-Prompt')
    const debugContext = debugContextB64 ? atob(debugContextB64) : undefined
    const debugUserPrompt = debugUserPromptB64 ? atob(debugUserPromptB64) : undefined

    let accumulatedText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      accumulatedText += chunk
      onStreamUpdate?.(accumulatedText)
    }

    return { text: accumulatedText, debugContext, debugUserPrompt }
  }

  const chartContent = (
    <DndContext
      id={dndContextId}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="mx-auto w-full max-w-10xl h-full flex flex-col gap-6 overflow-x-visible overflow-y-clip">
        {/* Mobile chart section - hidden on lg screens */}
        <section className="flex justify-center items-center h-full w-full lg:hidden">
          {mainChart ? (
            <ZoomableChart
              html={mainChart}
              className="relative w-full h-full max-w-md flex items-center justify-center"
            />
          ) : null}
        </section>

        {/* Main content grid */}
        <main className="grid gap-8 justify-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.5fr_5.65fr_2.5fr]">
          {/* Left column with details cards */}
          <DraggableColumn id={LEFT_COLUMN_ID} items={leftItems} className="relative z-10">
            {leftItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>

          {/* Desktop chart section - visible only on lg screens */}
          <section className="hidden lg:block w-full h-full relative z-0 lg:-translate-x-6">
            {mainChart ? (
              <ZoomableChart html={mainChart} className="absolute inset-0 flex items-center justify-center" />
            ) : null}
          </section>

          {/* Right column with houses positions and aspects grid */}
          <DraggableColumn id={RIGHT_COLUMN_ID} items={rightItems} className="relative">
            {rightItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>
        </main>

        {createPortal(
          <DragOverlay>
            {activeId ? <div className="opacity-80 rotate-2 cursor-grabbing">{renderCard(activeId)}</div> : null}
          </DragOverlay>,
          document.body,
        )}
      </div>
    </DndContext>
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
