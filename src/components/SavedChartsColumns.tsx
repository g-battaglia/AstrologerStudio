import type { ColumnDef, Column } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { format } from 'date-fns'

export type SavedChart = {
  id: string
  name: string
  type: string
  createdAt: string
  interpretation?: string
  tags?: string // JSON string
}

interface CreateSavedChartsColumnsProps {
  onEdit: (chart: SavedChart, e: React.MouseEvent) => void
  onDelete: (id: string, e: React.MouseEvent) => void
  onLoad: (id: string) => void
}

const SortableHeader = <T,>({ column, title }: { column: Column<T, unknown>; title: string }) => {
  return (
    <button
      className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      {title}
      {column.getIsSorted() === 'asc' && <span className="text-[10px]">▲</span>}
      {column.getIsSorted() === 'desc' && <span className="text-[10px]">▼</span>}
    </button>
  )
}

// Helper to parse tags from JSON string
const getTags = (chart: SavedChart): string[] => {
  try {
    if (!chart.tags) return []
    const parsed = JSON.parse(chart.tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function createSavedChartsColumns({
  onEdit,
  onDelete,
  onLoad,
}: CreateSavedChartsColumnsProps): ColumnDef<SavedChart, unknown>[] {
  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Name" />,
      cell: ({ row }) => <span className="font-medium">{row.getValue('name')}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      header: ({ column }) => <SortableHeader column={column} title="Type" />,
      cell: ({ row }) => <span className="capitalize">{row.getValue('type')}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = getTags(row.original)
        if (tags.length === 0) return <span className="text-muted-foreground">—</span>
        const maxVisible = 2
        const visible = tags.slice(0, maxVisible)
        const remaining = tags.length - maxVisible

        const content = (
          <div
            className="flex flex-nowrap gap-1 items-center"
            onClick={(e) => {
              if (remaining > 0) e.stopPropagation()
            }}
          >
            {visible.map((tag) => (
              <Badge key={tag} variant="secondary" className="whitespace-nowrap px-1 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="whitespace-nowrap text-muted-foreground px-1 py-0 text-[10px]">
                +{remaining}
              </Badge>
            )}
          </div>
        )

        if (remaining > 0) {
          return (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="cursor-help">{content}</div>
              </HoverCardTrigger>
              <HoverCardContent side="top" className="max-w-xs w-auto p-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="whitespace-nowrap">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        }

        return content
      },
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column} title="Created At" />,
      cell: ({ row }) => {
        const dateStr = row.getValue('createdAt') as string
        try {
          return <span className="tabular-nums">{format(new Date(dateStr), 'PP p')}</span>
        } catch {
          return <span className="text-muted-foreground">—</span>
        }
      },
      enableSorting: true,
      sortingFn: 'datetime',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const chart = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Chart actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => onLoad(chart.id)}>View Chart</DropdownMenuItem>
              <DropdownMenuItem onSelect={(e) => onEdit(chart, e as unknown as React.MouseEvent)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => onDelete(chart.id, e as unknown as React.MouseEvent)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableHiding: false,
    },
  ]
}
