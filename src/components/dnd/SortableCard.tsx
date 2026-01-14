import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ReactNode } from 'react'

interface SortableCardProps {
  id: string
  children: ReactNode
  className?: string
}

export function SortableCard({ id, children, className }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? ('relative' as const) : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={cn('relative group', className)}>
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className="absolute top-3 left-1/2 -translate-x-1/2 z-20 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-muted/50"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {children}
    </div>
  )
}
