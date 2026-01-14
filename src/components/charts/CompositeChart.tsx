'use client'

import { useState, useEffect, useMemo } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import { ChartResponse } from '@/types/astrology'
import { AspectTable } from './AspectTable'
import { AspectGrid } from './AspectGrid'
import AspectsCard from '@/components/AspectsCard'
import ZoomableChart from '@/components/ZoomableChart'
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
import CompositeDetailsCard from '@/components/CompositeDetailsCard'

interface CompositeChartProps {
  data: ChartResponse
  savedChartId?: string
  initialNotes?: string
}

const LEFT_COLUMN_ID = 'composite-left-column'
const RIGHT_COLUMN_ID = 'composite-right-column'

const DEFAULT_LEFT_ITEMS = ['composite-details-card', 'composite-planets-card']
const DEFAULT_RIGHT_ITEMS = ['composite-houses-card', 'composite-aspects-card']

export function CompositeChart({ data, savedChartId, initialNotes }: CompositeChartProps) {
  const { chart_wheel, chart_grid, chart_data } = data
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [_notes, setNotes] = useState(initialNotes || '')
  const { language, getActivePrompt, include_house_comparison } = useAIInterpretation()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Generate unique chartId for IndexedDB caching
  const chartId = useMemo(() => {
    const subjectName1 = chart_data.first_subject?.name || ''
    const subjectName2 = chart_data.second_subject?.name || ''
    return generateChartId('composite', subjectName1, '', subjectName2)
  }, [chart_data.first_subject?.name, chart_data.second_subject?.name])

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

  const renderCard = (id: string) => {
    switch (id) {
      case 'composite-details-card':
        return <CompositeDetailsCard id={id} chartData={chart_data} className="h-fit w-full" />
      case 'composite-planets-card':
        return (
          <NatalPlanetPositionsCard
            id={id}
            subject={chart_data.subject}
            className="h-fit w-full"
            title="Composite Points"
          />
        )
      case 'composite-houses-card':
        return (
          <NatalHousesPositionsCard
            id={id}
            subject={chart_data.subject}
            className="h-fit w-full"
            title="Composite Houses"
          />
        )
      case 'composite-aspects-card':
        return chart_grid ? <AspectsCard id={id} html={chart_grid} className="w-full" /> : null
      default:
        return null
    }
  }

  const handleGenerateAI = async (
    onStreamUpdate?: (text: string) => void,
    signal?: AbortSignal,
    relationshipType?: string,
  ) => {
    const chartType = 'composite'

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
          {/* Left column: Details */}
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

          {/* Right column: Houses + Aspects */}
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

  const aspectsContent = <AspectTable aspects={chart_data.aspects} className="mx-auto w-full max-w-8xl" />

  const dataContent = (
    <div className="mx-auto w-full max-w-8xl">
      <ChartDataView data={data} chartType="composite" />
    </div>
  )

  const interpretationContent = (
    <NotesPanel
      savedChartId={savedChartId}
      initialNotes={initialNotes}
      onNotesChange={setNotes}
      onGenerateAI={handleGenerateAI}
      showRelationshipSelector
      chartId={chartId}
    />
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
        interpretationContent={interpretationContent}
        aspects={chart_data.aspects}
        activePoints={chart_data.active_points}
      />
    </div>
  )
}
