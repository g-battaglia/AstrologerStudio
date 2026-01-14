'use client'

import { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/data-table/DataTable'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/logging/client'
import { TagFilter } from '@/components/TagFilter'
import { createSavedChartsColumns, type SavedChart } from '@/components/SavedChartsColumns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

export function SavedCalculationsTable() {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([])
  const [loading, setLoading] = useState(true)
  const [editingChart, setEditingChart] = useState<SavedChart | null>(null)
  const [newName, setNewName] = useState('')
  const [newTags, setNewTags] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'single' | 'bulk'; ids: string[] } | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    fetchSavedCharts()
  }, [])

  const fetchSavedCharts = async () => {
    try {
      const res = await fetch('/api/saved-charts')
      if (res.ok) {
        const data = await res.json()
        setSavedCharts(data)
      }
    } catch (error) {
      clientLogger.error('Error fetching saved charts:', error)
      toast.error('Failed to load saved charts')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setDeleteConfirm({ type: 'single', ids: [id] })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return

    if (deleteConfirm.type === 'single') {
      const id = deleteConfirm.ids[0]
      try {
        const res = await fetch(`/api/saved-charts/${id}`, {
          method: 'DELETE',
        })

        if (res.ok) {
          setSavedCharts(savedCharts.filter((c) => c.id !== id))
          toast.success('Chart deleted')
        } else {
          throw new Error('Failed to delete')
        }
      } catch (error) {
        clientLogger.error('Error deleting chart:', error)
        toast.error('Failed to delete chart.')
      }
    } else {
      // Bulk delete
      try {
        const res = await fetch('/api/saved-charts/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: deleteConfirm.ids }),
        })

        if (res.ok) {
          setSavedCharts(savedCharts.filter((c) => !new Set(deleteConfirm.ids).has(c.id)))
          toast.success('Charts deleted')
        } else {
          throw new Error('Failed to delete')
        }
      } catch (error) {
        clientLogger.error('Error bulk deleting charts:', error)
        toast.error('Failed to delete charts.')
      }
    }
    setDeleteConfirm(null)
  }

  const handleBulkDelete = (selected: SavedChart[]) => {
    if (selected.length === 0) return
    setDeleteConfirm({ type: 'bulk', ids: selected.map((c) => c.id) })
  }

  const handleEdit = async () => {
    if (!editingChart) return

    const tagsArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    try {
      const res = await fetch(`/api/saved-charts/${editingChart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          tags: tagsArray,
        }),
      })

      if (res.ok) {
        setSavedCharts(
          savedCharts.map((c) =>
            c.id === editingChart.id
              ? { ...c, name: newName, tags: tagsArray.length ? JSON.stringify(tagsArray) : undefined }
              : c,
          ),
        )
        setEditingChart(null)
        setNewName('')
        setNewTags('')
        toast.success('Chart updated')
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      clientLogger.error('Error updating chart:', error)
      toast.error('Failed to update chart.')
    }
  }

  const openEditDialog = (chart: SavedChart, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingChart(chart)
    setNewName(chart.name)
    try {
      if (chart.tags) {
        const parsed = JSON.parse(chart.tags)
        setNewTags(Array.isArray(parsed) ? parsed.join(', ') : '')
      } else {
        setNewTags('')
      }
    } catch {
      setNewTags('')
    }
  }

  const handleLoadChart = (id: string) => {
    router.push(`/saved-calculations/${id}`)
  }

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    savedCharts.forEach((chart) => {
      getTags(chart).forEach((tag) => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [savedCharts])

  // Filter charts by selected tags
  const filteredData = useMemo(() => {
    if (selectedTags.length === 0) return savedCharts
    return savedCharts.filter((chart) => {
      const chartTags = getTags(chart)
      return selectedTags.some((tag) => chartTags.includes(tag))
    })
  }, [savedCharts, selectedTags])

  const columns = useMemo(
    () =>
      createSavedChartsColumns({
        onEdit: openEditDialog,
        onDelete: handleDelete,
        onLoad: handleLoadChart,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="w-full p-0 md:p-2 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start flex-wrap gap-3 justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Calculations</h1>
            <p className="text-neutral-600 dark:text-neutral-300 mt-1 text-sm">Your saved charts and calculations.</p>
          </div>
        </div>

        <DataTable<SavedChart, unknown>
          columns={columns}
          data={filteredData}
          isLoading={loading}
          tableId="saved-charts-table"
          getRowId={(row) => row.id}
          globalFilter={true}
          filterPlaceholder="Search saved charts..."
          onRowClick={(row) => handleLoadChart(row.id)}
          toolbarActions={
            <TagFilter allTags={allTags} selectedTags={selectedTags} onSelectionChange={setSelectedTags} />
          }
          bulkActions={(selected) => (
            <Button variant="destructive" size="sm" onClick={() => handleBulkDelete(selected)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selected.length})
            </Button>
          )}
        />
      </div>

      <Dialog open={!!editingChart} onOpenChange={(open) => !open && setEditingChart(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Saved Chart</DialogTitle>
            <DialogDescription>Update details for your saved calculation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="personal, client, 2024"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEdit()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingChart(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'bulk'
                ? `This action cannot be undone. This will permanently delete ${deleteConfirm.ids.length} selected charts.`
                : 'This action cannot be undone. This will permanently delete this chart.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
