import type { ColumnDef, Column } from '@tanstack/react-table'
import type { Subject } from '@/types/subjects'
import type { ColumnActionsProps } from '@/types/ui'
import type { DateFormat } from '@/lib/utils/date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { formatDisplayDate } from '@/lib/utils/date'
import { Checkbox } from '@/components/ui/checkbox'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

interface CreateSubjectsColumnsProps extends ColumnActionsProps {
  dateFormat?: DateFormat
}

const SortableHeader = ({ column, title }: { column: Column<Subject, unknown>; title: string }) => {
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

export function createSubjectsColumns({
  openEditDialog,
  openDeleteDialog,
  dateFormat = 'EU',
}: CreateSubjectsColumnsProps): ColumnDef<Subject, unknown>[] {
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
      accessorKey: 'id',
      header: ({ column }) => <SortableHeader column={column} title="ID" />,
      cell: ({ row }) => <code className="text-xs font-mono">{row.getValue('id')}</code>,
      enableSorting: true,
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Name" />,
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'birth_datetime',
      header: ({ column }) => <SortableHeader column={column} title="Birth date/time" />,
      cell: ({ row }) => {
        const raw = row.getValue('birth_datetime') as string
        const d = new Date(raw)
        if (isNaN(d.getTime())) return <span className="text-muted-foreground">—</span>
        // Show date using user's preferred format, plus time in UTC
        const datePart = formatDisplayDate(raw, dateFormat)
        const timePart = (() => {
          const hh = String(d.getUTCHours()).padStart(2, '0')
          const mm = String(d.getUTCMinutes()).padStart(2, '0')
          const ss = String(d.getUTCSeconds()).padStart(2, '0')
          return `${hh}:${mm}:${ss}`
        })()
        return (
          <span className="tabular-nums">
            {datePart} {timePart}
          </span>
        )
      },
      enableHiding: true,
      enableSorting: true,
      sortingFn: 'datetime', // Ensure proper datetime sorting
    },
    {
      accessorKey: 'latitude',
      header: ({ column }) => <SortableHeader column={column} title="Latitude" />,
      cell: ({ row }) => {
        const v = row.getValue('latitude') as number | undefined
        if (v == null || Number.isNaN(v)) return <span className="text-muted-foreground">—</span>
        return <span className="tabular-nums">{v.toFixed(4)}</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'longitude',
      header: ({ column }) => <SortableHeader column={column} title="Longitude" />,
      cell: ({ row }) => {
        const v = row.getValue('longitude') as number | undefined
        if (v == null || Number.isNaN(v)) return <span className="text-muted-foreground">—</span>
        return <span className="tabular-nums">{v.toFixed(4)}</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'city',
      header: ({ column }) => <SortableHeader column={column} title="City" />,
      cell: ({ row }) => {
        const v = row.getValue('city') as string | undefined
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'nation',
      header: ({ column }) => <SortableHeader column={column} title="Nation" />,
      cell: ({ row }) => {
        const v = row.getValue('nation') as string | undefined
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'timezone',
      header: ({ column }) => <SortableHeader column={column} title="Timezone" />,
      cell: ({ row }) => {
        const v = row.getValue('timezone') as string | undefined
        return v ? <code className="text-xs">{v}</code> : <span className="text-muted-foreground">—</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'rodens_rating',
      header: ({ column }) => <SortableHeader column={column} title="Rodden's rating" />,
      cell: ({ row }) => {
        const v = row.getValue('rodens_rating') as string | null | undefined
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>
      },
      enableHiding: true,
      enableSorting: true,
    },
    {
      accessorKey: 'tags',
      header: ({ column }) => <SortableHeader column={column} title="Tags" />,
      cell: ({ row }) => {
        const tags = row.getValue('tags') as string[] | null | undefined
        if (!tags || tags.length === 0) return <span className="text-muted-foreground">—</span>
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
            {visible.map((t) => (
              <Badge key={t} variant="secondary" className="whitespace-nowrap">
                {t}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="whitespace-nowrap text-muted-foreground">
                +{remaining}
              </Badge>
            )}
          </div>
        )

        // Only wrap in HoverCard if there are hidden tags
        if (remaining > 0) {
          return (
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <div className="cursor-help">{content}</div>
              </HoverCardTrigger>
              <HoverCardContent
                side="top"
                className="max-w-xs bg-popover text-popover-foreground border shadow-md w-auto p-2"
              >
                <div className="flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="whitespace-nowrap">
                      {t}
                    </Badge>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        }

        return content
      },
      enableHiding: true,
      enableSorting: false, // Tags hard to sort
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const subject = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label="Subject actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => {
                  openEditDialog(subject)
                }}
              >
                Edit Subject
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/natal`
                }}
              >
                View Natal Chart
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/transits`
                }}
              >
                View Transits
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/timeline`
                }}
              >
                View Timeline Event
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/synastry`
                }}
              >
                View Synastry
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/composite`
                }}
              >
                View Composite Chart
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/solar-return`
                }}
              >
                View Solar Return
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  window.location.href = `/subjects/${subject.id}/lunar-return`
                }}
              >
                View Lunar Return
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  openDeleteDialog(subject)
                }}
              >
                Delete Subject
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault()
                  navigator.clipboard?.writeText(subject.id).catch(() => {})
                }}
              >
                Copy ID
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
      enableHiding: false,
    },
  ]
}
