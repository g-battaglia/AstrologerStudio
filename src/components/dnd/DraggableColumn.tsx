import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface DraggableColumnProps {
  id: string
  items: string[]
  children: ReactNode
  className?: string
}

export function DraggableColumn({ id, items, children, className }: DraggableColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
  })

  return (
    <SortableContext id={id} items={items} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className={cn('flex flex-col gap-6 w-full', className)}>
        {children}
      </div>
    </SortableContext>
  )
}
