'use client'

import { useState, useEffect, useMemo } from 'react'
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

interface TransitChartProps {
  data: ChartResponse
  natalData: ChartResponse
  transitData: ChartResponse
  savedChartId?: string
  initialNotes?: string
  notes?: string
  onNotesChange?: (notes: string) => void
  /** If true, shows a warning that chart data has changed since AI was generated */
  isDataStale?: boolean
  /** Label describing what the stale notes were generated for */
  staleDataLabel?: string
}

const LEFT_COLUMN_ID = 'transit-left-column'
const RIGHT_COLUMN_ID = 'transit-right-column'

const DEFAULT_LEFT_ITEMS = ['natal-subject-details-card', 'natal-planets-card', 'natal-houses-card']
const DEFAULT_RIGHT_ITEMS = ['transit-subject-details-card', 'transit-planets-card', 'transit-aspects-card']

export function TransitChart({
  data,
  natalData,
  transitData,
  savedChartId,
  initialNotes,
  notes: propNotes,
  onNotesChange,
  isDataStale = false,
  staleDataLabel,
}: TransitChartProps) {
  const { chart_wheel, chart_grid, chart_data } = data
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [localNotes, setLocalNotes] = useState(initialNotes || '')
  const { language, getActivePrompt, include_house_comparison } = useAIInterpretation()

  const notes = propNotes !== undefined ? propNotes : localNotes
  const handleNotesChange = onNotesChange || setLocalNotes

  // Generate unique chartId for IndexedDB caching
  // For transits, use only the date (not time) since transit time is always "now"
  const chartId = useMemo(() => {
    const subjectName = natalData.chart_data.subject.name
    const natalDate = natalData.chart_data.subject.iso_formatted_utc_datetime || ''
    // Extract only date portion (YYYY-MM-DD) from transit datetime
    const transitDateFull = transitData.chart_data.subject.iso_formatted_utc_datetime || ''
    const transitDate = transitDateFull.split('T')[0] || ''
    return generateChartId('transit', subjectName, natalDate, undefined, transitDate)
  }, [
    natalData.chart_data.subject.name,
    natalData.chart_data.subject.iso_formatted_utc_datetime,
    transitData.chart_data.subject.iso_formatted_utc_datetime,
  ])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fallback to 'chart' if 'chart_wheel' is missing (backward compatibility)
  const mainChart = chart_wheel || data.chart

  // Use nullish coalescing to allow empty columns (when all cards are dragged to one side)
  // Also deduplicate items to prevent React key errors
  const rawLeftItems = layout[LEFT_COLUMN_ID] ?? DEFAULT_LEFT_ITEMS
  const rawRightItems = layout[RIGHT_COLUMN_ID] ?? DEFAULT_RIGHT_ITEMS

  // Ensure no item appears in both columns - left takes priority
  const leftItems = [...new Set(rawLeftItems)]
  const rightItems = [...new Set(rawRightItems)].filter((id) => !leftItems.includes(id))

  // Initialize layout only if keys don't exist at all (first time setup)
  useEffect(() => {
    // If entire columns are missing
    if (!(LEFT_COLUMN_ID in layout)) {
      updateLayout(LEFT_COLUMN_ID, DEFAULT_LEFT_ITEMS)
    }
    if (!(RIGHT_COLUMN_ID in layout)) {
      updateLayout(RIGHT_COLUMN_ID, DEFAULT_RIGHT_ITEMS)
    }

    // Check if new items (like 'natal-houses-card') are missing from existing layout
    const currentLeft = layout[LEFT_COLUMN_ID] || []
    const currentRight = layout[RIGHT_COLUMN_ID] || []
    const allCurrentItems = [...new Set([...currentLeft, ...currentRight])]

    if (!allCurrentItems.includes('natal-houses-card')) {
      // Add missing card to left column
      updateLayout(LEFT_COLUMN_ID, [
        ...new Set([...(layout[LEFT_COLUMN_ID] || DEFAULT_LEFT_ITEMS), 'natal-houses-card']),
      ])
    }

    // Clean up duplicates if they exist
    const leftSet = new Set(currentLeft)
    const rightSet = new Set(currentRight)
    const hasDuplicatesInLeft = currentLeft.length !== leftSet.size
    const hasDuplicatesInRight = currentRight.length !== rightSet.size
    const hasOverlap = [...leftSet].some((id) => rightSet.has(id))

    if (hasDuplicatesInLeft || hasDuplicatesInRight || hasOverlap) {
      const cleanLeft = [...leftSet]
      const cleanRight = [...rightSet].filter((id) => !leftSet.has(id))
      updateLayout(LEFT_COLUMN_ID, cleanLeft)
      updateLayout(RIGHT_COLUMN_ID, cleanRight)
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
      case 'natal-subject-details-card':
        return <SubjectDetailsCard id={id} subject={natalData.chart_data} className="h-fit w-full" />
      case 'natal-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={natalData.chart_data.subject}
            className="h-fit w-full"
            title="Natal Points"
          />
        )
      case 'transit-subject-details-card':
        return <SubjectDetailsCard id={id} subject={transitData.chart_data} className="h-fit w-full" />
      case 'transit-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={transitData.chart_data.subject}
            className="h-fit w-full"
            projectedPoints={chart_data.house_comparison?.second_points_in_first_houses}
            title="Transit Points"
          />
        )
      case 'natal-houses-card':
        return <NatalHousesPositionsCard id={id} subject={natalData.chart_data.subject} className="h-fit w-full" />
      case 'aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      case 'transit-aspects-card':
        return chart_grid ? (
          <AspectsCard id={id} html={chart_grid} className="w-full" rowLabel="Natal" colLabel="Transit" />
        ) : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (onStreamUpdate?: (text: string) => void, signal?: AbortSignal) => {
    const chartType = 'transit'

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

    // Extract debug headers (base64 encoded)
    const debugContextB64 = response.headers.get('X-AI-Context')
    const debugUserPromptB64 = response.headers.get('X-AI-User-Prompt')
    const debugContext = debugContextB64 ? atob(debugContextB64) : undefined
    const debugUserPrompt = debugUserPromptB64 ? atob(debugUserPromptB64) : undefined

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) throw new Error('No response body')

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
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          {/* Left column: Natal Subject Details */}
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

          {/* Right column: Transit Subject Details + Aspects */}
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
      p1Label={natalData.chart_data.subject.name}
      p2Label="Transit"
    />
  )

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView
        data={natalData}
        secondaryData={transitData}
        primaryLabel={natalData.chart_data.subject.name}
        secondaryLabel="Transit"
        chartType="transit"
        houseComparison={chart_data.house_comparison}
        aspects={chart_data.aspects}
      />
    </div>
  )

  const interpretationContent = (
    <NotesPanel
      savedChartId={savedChartId}
      initialNotes={initialNotes}
      notes={notes}
      onNotesChange={handleNotesChange}
      onGenerateAI={handleGenerateAI}
      isDataStale={isDataStale}
      staleDataLabel={staleDataLabel}
      chartId={chartId}
    />
  )

  const gridContent = (
    <AspectGrid
      aspects={chart_data.aspects}
      type="double"
      className="mx-auto w-full max-w-8xl"
      activePoints={chart_data.active_points}
      rowLabel="Natal"
      colLabel="Transit"
      rowSubject={natalData.chart_data.subject}
      colSubject={transitData.chart_data.subject}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <ChartTabContents
        chartContent={chartContent}
        aspectsContent={aspectsContent}
        gridContent={gridContent}
        dataContent={dataContent}
        interpretationContent={interpretationContent}
        aspects={chart_data.aspects}
        activePoints={chart_data.active_points}
        aspectFilterType="double"
        primaryFilterLabel="Natal Planets"
        secondaryFilterLabel="Transit Planets"
      />
    </div>
  )
}
