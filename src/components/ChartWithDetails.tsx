import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core'
import { createPortal } from 'react-dom'

import type { BirthChartDataFetchedType } from '@/types/birthChart'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import ZoomableChart from '@/components/ZoomableChart'
import AspectsCard from '@/components/AspectsCard'
import { DraggableColumn } from '@/components/dnd/DraggableColumn'
import { SortableCard } from '@/components/dnd/SortableCard'
import { useUIPreferences } from '@/stores/uiPreferences'

type Props = {
  dataFetched: BirthChartDataFetchedType
}

const LEFT_COLUMN_ID = 'natal-left-column'
const RIGHT_COLUMN_ID = 'natal-right-column'

const DEFAULT_LEFT_ITEMS = ['subject-details-card', 'natal-planets-card']
const DEFAULT_RIGHT_ITEMS = ['natal-houses-card', 'aspects-card']

export default function ChartWithDetails({ dataFetched }: Props) {
  const subject = dataFetched.data || null
  const { layout, updateLayout, moveItem } = useUIPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)

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
        return subject ? <SubjectDetailsCard id={id} subject={subject} className="h-fit w-full" /> : null
      case 'natal-planets-card':
        return subject ? <NatalPlanetPositionsCard id={id} subject={subject} className="h-fit w-full" /> : null
      case 'natal-houses-card':
        return subject ? <NatalHousesPositionsCard id={id} subject={subject} className="h-fit w-full" /> : null
      case 'aspects-card':
        return dataFetched.aspects_grid ? (
          <AspectsCard id={id} html={dataFetched.aspects_grid} className="w-full" />
        ) : null
      default:
        return null
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mx-auto w-full max-w-10xl h-full flex flex-col gap-6 overflow-hidden">
        {/* Mobile chart section - hidden on lg screens */}
        <section className="flex justify-center items-center h-full w-full lg:hidden">
          {dataFetched.chart ? (
            <ZoomableChart
              html={dataFetched.chart}
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
            {dataFetched.chart ? (
              <ZoomableChart html={dataFetched.chart} className="absolute inset-0 flex items-center justify-center" />
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
}
