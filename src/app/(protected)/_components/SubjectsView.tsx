'use client'

/**
 * Main view component for the Subjects list page
 *
 * Features:
 * - Data table with sorting, filtering, column visibility
 * - CRUD operations via dialogs
 * - Bulk actions (delete, synastry, composite)
 * - Import/Export via settings menu
 *
 * @module app/(protected)/_components/SubjectsView
 */

import { DataTable } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import type { Subject } from '@/types/subjects'
import { useSubjects } from '@/hooks/useSubjects'
import { useDateFormat } from '@/hooks/useDateFormat'
import { DeleteSubjectDialog } from '@/components/DeleteSubjectDialog'
import { EditSubjectDialog } from '@/components/EditSubjectDialog'
import { CreateSubjectDialog } from '@/components/CreateSubjectDialog'
import { createSubjectsColumns } from '@/components/SubjectsColumns'
import { Plus, Trash2, GitCompare, GitMerge } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { deleteSubjects } from '@/lib/api/subjects'
import Papa from 'papaparse'
import { ImportSubjectsDialog } from '@/components/ImportSubjectsDialog'
import { SubjectsTableSettings } from '@/components/SubjectsTableSettings'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useState, useMemo } from 'react'
import { TagFilter } from '@/components/TagFilter'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { useSubscription } from '@/lib/subscription/hooks'
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'
import { PLAN_LIMITS } from '@/lib/subscription/plan-limits'
import Link from 'next/link'

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SubjectsView() {
  const { query, deleteDialog, editDialog, createDialog, actions } = useSubjects()
  const dateFormat = useDateFormat()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Subscription Limit Check
  const billingEnabled = isDodoPaymentsEnabled()
  const { data: subscription, isLoading: isSubscriptionLoading } = useSubscription()
  const isFreeUser = billingEnabled && !isSubscriptionLoading && (subscription?.plan === 'free' || !subscription?.plan)

  const subjectCount = query.data?.length || 0
  const maxSubjects = PLAN_LIMITS.free.maxSubjects
  const limitReached = isFreeUser && subjectCount >= maxSubjects

  // Local state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Compute all unique tags from subjects
  const allTags = useMemo(() => {
    if (!query.data) return []
    const tagSet = new Set<string>()
    query.data.forEach((subject) => {
      subject.tags?.forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet)
  }, [query.data])

  // Filter subjects by selected tags
  const filteredData = useMemo(() => {
    if (!query.data) return []
    if (selectedTags.length === 0) return query.data
    return query.data.filter((subject) => selectedTags.some((tag) => subject.tags?.includes(tag)))
  }, [query.data, selectedTags])

  // Export handler
  const handleExport = () => {
    if (!query.data) return

    const csv = Papa.unparse(
      query.data.map((s) => ({
        name: s.name,
        birthDatetime: s.birth_datetime,
        city: s.city,
        nation: s.nation,
        latitude: s.latitude,
        longitude: s.longitude,
        timezone: s.timezone,
        rodensRating: s.rodens_rating,
        tags: s.tags?.join(','),
        notes: s.notes,
      })),
    )

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'subjects_export.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteSubjects(ids),
    onSuccess: (res) => {
      toast.success(`${res.count} subjects deleted`)
      queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setIsBulkDeleteDialogOpen(false)
      setSelectedIds([])
    },
    onError: (err) => {
      toast.error('Error deleting subjects', { description: (err as Error).message })
    },
  })

  // Table columns
  const columns = createSubjectsColumns({
    openEditDialog: actions.openEditDialog,
    openDeleteDialog: actions.openDeleteDialog,
    dateFormat,
  })

  return (
    <div className="w-full p-0 md:p-2 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start flex-wrap gap-3 justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects</h1>
          <p className="text-neutral-600 dark:text-neutral-300 mt-1 text-sm">Subject list loaded from your account.</p>
        </div>
      </div>

      {/* Limit Reached Banner */}
      {limitReached && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-600 ring-1 ring-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4" />
            <h5 className="font-semibold leading-none tracking-tight">Subject Limit Reached</h5>
          </div>
          <div className="mt-2 text-sm [&_p]:leading-relaxed flex flex-col sm:flex-row sm:items-center gap-2">
            <span>You have reached the maximum of {maxSubjects} subjects allowed on the Free plan.</span>
            <Link href="/pricing" className="font-semibold underline underline-offset-4 hover:text-amber-700">
              Upgrade to Pro →
            </Link>
          </div>
        </div>
      )}

      {/* Error display */}
      {query.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Error: {(query.error as Error).message}
        </div>
      )}

      {/* Data Table */}
      <DataTable<Subject, unknown>
        columns={columns}
        data={filteredData}
        isLoading={query.isLoading || query.isFetching}
        tableId="subjects-table"
        getRowId={(row) => row.id}
        globalFilter={true}
        filterPlaceholder="Search all fields..."
        toolbarActions={
          <>
            <TagFilter allTags={allTags} selectedTags={selectedTags} onSelectionChange={setSelectedTags} />
            <Button
              type="button"
              variant={limitReached ? 'default' : 'ghost'}
              className={
                limitReached
                  ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                  : 'border border-dashed'
              }
              onClick={() => {
                if (limitReached) {
                  router.push('/pricing')
                } else {
                  actions.openCreateDialog()
                }
              }}
            >
              {limitReached ? (
                <span className="font-semibold">Upgrade to Add Subject</span>
              ) : (
                <>
                  <Plus className="size-4" /> <span className="hidden md:inline">Add Subject</span>
                </>
              )}
            </Button>
          </>
        }
        settingsMenu={(table) => (
          <SubjectsTableSettings
            table={table}
            tableId="subjects-table"
            onExport={handleExport}
            onImport={() => setImportDialogOpen(true)}
            exportDisabled={!query.data?.length}
          />
        )}
        onRowClick={(subject) => router.push(`/subjects/${subject.id}/natal`)}
        contextActions={(selectedRows) =>
          selectedRows.length === 2 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/subjects/${selectedRows[0]!.id}/synastry/${selectedRows[1]!.id}`)}
              >
                <GitCompare className="size-4 mr-2" />
                Synastry
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/subjects/${selectedRows[0]!.id}/composite/${selectedRows[1]!.id}`)}
              >
                <GitMerge className="size-4 mr-2" />
                Composite
              </Button>
            </>
          ) : null
        }
        bulkActions={(selectedRows) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setSelectedIds(selectedRows.map((r) => r.id))
              setIsBulkDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="size-4 mr-2" />
            Delete ({selectedRows.length})
          </Button>
        )}
        footer={<div className="text-xs text-neutral-500 mt-2">Subjects are stored per user.</div>}
      />

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected subjects and all associated saved
              charts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Individual Subject Dialogs */}
      <DeleteSubjectDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        subject={deleteDialog.subject}
        error={deleteDialog.error}
        isDeleting={deleteDialog.mutation.isPending}
        onConfirm={deleteDialog.onConfirm}
      />

      <EditSubjectDialog
        open={editDialog.open}
        onOpenChange={editDialog.setOpen}
        subject={editDialog.subject}
        error={editDialog.error}
        form={editDialog.form}
        isUpdating={editDialog.mutation.isPending}
        onSubmit={editDialog.onSubmit}
      />

      <CreateSubjectDialog
        open={createDialog.open}
        onOpenChange={createDialog.setOpen}
        error={createDialog.error}
        form={createDialog.form}
        isCreating={createDialog.mutation.isPending}
        onSubmit={createDialog.onSubmit}
      />

      <ImportSubjectsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  )
}
