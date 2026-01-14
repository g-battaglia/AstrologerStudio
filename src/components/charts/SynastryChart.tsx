'use client'

import { useState, useEffect, useId, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import { ChartResponse } from '@/types/astrology'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import AspectsCard from '@/components/AspectsCard'
import ZoomableChart from '@/components/ZoomableChart'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import { ChartTabContents } from './ChartTabs'
import { DraggableColumn } from '@/components/dnd/DraggableColumn'
import { SortableCard } from '@/components/dnd/SortableCard'
import { useUIPreferences } from '@/stores/uiPreferences'

import { ChartDataView } from './ChartDataView'
import { NotesPanel } from '@/components/NotesPanel'
import { useAIInterpretation } from '@/stores/aiInterpretationSettings'
import { CHART_TYPE_PROMPTS } from '@/lib/ai/prompts'
import { generateChartId } from '@/lib/cache/interpretations'

interface SynastryChartProps {
  data: ChartResponse
  subject1Data: ChartResponse
  subject2Data: ChartResponse
  savedChartId?: string
  initialNotes?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** Override chart type for AI interpretation (e.g., 'solar_return', 'lunar_return') */
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
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [localNotes, setLocalNotes] = useState(initialNotes || '')
  const { language, getActivePrompt, include_house_comparison } = useAIInterpretation()
  const dndContextId = useId()

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

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fallback to 'chart' if 'chart_wheel' is missing
  const mainChart = chart_wheel || data.chart

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
              chartTypeOverride === 'solar_return'
                ? 'Solar Return'
                : chartTypeOverride === 'lunar_return'
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
              chartTypeOverride === 'solar_return'
                ? 'Solar Return Points'
                : chartTypeOverride === 'lunar_return'
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
    const subjectName1 = subject1Data.chart_data.subject.name
    const subjectName2 = subject2Data.chart_data.subject.name
    const activePointsKey = [...data.chart_data.active_points].sort().join(',')
    const _chartId = `${chartType}-${subjectName1}-${subjectName2}-${activePointsKey}`

    const response = await fetch('/api/ai/interpret', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chartData: {
          ...data.chart_data,
          first_subject: data.chart_data.first_subject || subject1Data.chart_data.subject,
          second_subject: data.chart_data.second_subject || subject2Data.chart_data.subject,
        },
        chartType,
        systemPrompt: getActivePrompt(),
        chartTypePrompt: CHART_TYPE_PROMPTS[chartType] || '',
        language,
        include_house_comparison,
        relationshipType,
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

        <main className="grid gap-8 justify-items-center grid-cols-1 md:grid-cols-2 lg:grid-cols-[2.5fr_5.65fr_2.5fr]">
          {/* Left column: Subject 1 Details */}
          <DraggableColumn id={LEFT_COLUMN_ID} items={leftItems} className="relative z-10">
            {leftItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>

          {/* Center: Chart */}
          <section className="hidden lg:block w-full h-full relative z-0 lg:-translate-x-6">
            {mainChart ? (
              <ZoomableChart html={mainChart} className="absolute inset-0 flex items-center justify-center" />
            ) : null}
          </section>

          {/* Right column: Subject 2 Details + Aspects */}
          <DraggableColumn id={RIGHT_COLUMN_ID} items={rightItems} className="relative">
            {rightItems.map((id) => (
              <SortableCard key={id} id={id}>
                {renderCard(id)}
              </SortableCard>
            ))}
          </DraggableColumn>
        </main>

        {mounted &&
          createPortal(
            <DragOverlay>
              {activeId ? <div className="opacity-80 rotate-2 cursor-grabbing">{renderCard(activeId)}</div> : null}
            </DragOverlay>,
            document.body,
          )}
      </div>
    </DndContext>
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
