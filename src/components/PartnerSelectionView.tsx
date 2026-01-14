'use client'

import { useMemo, useState } from 'react'
import { User, Calendar, UserPlus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { getSubjects, getSubjectById } from '@/actions/subjects'
import { useDateFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate } from '@/lib/utils/date'
import { DataTable } from '@/components/data-table/DataTable'
import { SubjectSelectorDialog } from '@/components/SubjectSelectorDialog'
import Link from 'next/link'
import type { ColumnDef, Column } from '@tanstack/react-table'
import type { Subject } from '@/types/subjects'
import type { DateFormat } from '@/lib/utils/date'

interface PartnerSelectionViewProps {
  subjectId: string
  chartType: 'synastry' | 'composite'
  title: string
  subtitle: string
}

// Sortable header helper
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

// Create simplified columns for partner selection (no actions, no checkbox)
function createPartnerColumns(dateFormat: DateFormat): ColumnDef<Subject, unknown>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column} title="Name" />,
      enableSorting: true,
    },
    {
      accessorKey: 'birth_datetime',
      header: ({ column }) => <SortableHeader column={column} title="Birth date/time" />,
      cell: ({ row }) => {
        const raw = row.getValue('birth_datetime') as string
        const d = new Date(raw)
        if (isNaN(d.getTime())) return <span className="text-muted-foreground">—</span>
        const datePart = formatDisplayDate(raw, dateFormat)
        const timePart = (() => {
          const hh = String(d.getUTCHours()).padStart(2, '0')
          const mm = String(d.getUTCMinutes()).padStart(2, '0')
          return `${hh}:${mm}`
        })()
        return (
          <span className="tabular-nums">
            {datePart} {timePart}
          </span>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'city',
      header: ({ column }) => <SortableHeader column={column} title="City" />,
      cell: ({ row }) => {
        const v = row.getValue('city') as string | undefined
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>
      },
      enableSorting: true,
    },
    {
      accessorKey: 'nation',
      header: ({ column }) => <SortableHeader column={column} title="Nation" />,
      cell: ({ row }) => {
        const v = row.getValue('nation') as string | undefined
        return v ? <span>{v}</span> : <span className="text-muted-foreground">—</span>
      },
      enableSorting: true,
    },
  ]
}

export function PartnerSelectionView({ subjectId, chartType, title, subtitle }: PartnerSelectionViewProps) {
  const router = useRouter()
  const dateFormat = useDateFormat()
  const [changeDialogOpen, setChangeDialogOpen] = useState(false)

  const { data: subject, isLoading: isLoadingSubject } = useQuery({
    queryKey: ['subject', subjectId],
    queryFn: () => getSubjectById(subjectId),
  })

  const { data: allSubjects, isLoading: isLoadingAll } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects(),
  })

  // Filter out the current subject
  const potentialPartners = useMemo(() => {
    return allSubjects?.filter((s) => s.id !== subjectId) || []
  }, [allSubjects, subjectId])

  // Create columns with date format
  const columns = useMemo(() => createPartnerColumns(dateFormat), [dateFormat])

  const handlePartnerSelect = (partner: Subject) => {
    router.push(`/subjects/${subjectId}/${chartType}/${partner.id}`)
  }

  if (isLoadingSubject || isLoadingAll) {
    return (
      <div className="space-y-6 p-0 md:p-2">
        <div className="space-y-2">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
        <Skeleton className="h-32 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold">Subject not found</h2>
        <p className="text-muted-foreground mt-2">The selected subject could not be found.</p>
        <Button asChild className="mt-6">
          <Link href="/subjects">Go to Subjects</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6 p-0 md:p-2">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title.replace('{name}', subject.name)}</h1>
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {/* First Subject Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
              1
            </span>
            <h2 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">First Subject</h2>
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-2 text-[10px] ml-1"
              onClick={() => setChangeDialogOpen(true)}
            >
              Change
            </Button>
          </div>
          <div className="inline-flex flex-wrap items-start gap-x-5 gap-y-2 px-5 py-4 rounded-xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
                <User className="size-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{subject.name}</span>
                <span className="text-xs text-muted-foreground">
                  {subject.city}, {subject.nation}
                </span>
              </div>
            </div>
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="size-4 opacity-60" />
              <span>{formatDisplayDate(subject.birth_datetime, dateFormat)}</span>
            </div>
          </div>
        </div>

        {/* Second Subject Selection Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold">
              2
            </span>
            <h2 className="text-xs font-medium text-muted-foreground/70 uppercase tracking-widest">
              Select Second Subject
            </h2>
          </div>

          {potentialPartners.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">No other subjects available</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Create another subject to compare charts with {subject.name}.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/subjects">Add New Subject</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DataTable<Subject, unknown>
              columns={columns}
              data={potentialPartners}
              isLoading={false}
              tableId={`partner-selection-${chartType}`}
              globalFilter={true}
              largeRows={true}
              filterPlaceholder="Filter..."
              onRowClick={handlePartnerSelect}
            />
          )}
        </div>
      </div>

      {/* Change First Subject Dialog */}
      <SubjectSelectorDialog
        open={changeDialogOpen}
        onOpenChange={setChangeDialogOpen}
        onSelect={(newSubject) => {
          router.push(`/subjects/${newSubject.id}/${chartType}`)
        }}
        title="Select First Subject"
      />
    </>
  )
}
