'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/logging/client'
import type { SavedChartParams } from '@/types/saved-chart-params'

interface SaveChartButtonProps {
  /** The parameters needed to recalculate this chart */
  chartParams: SavedChartParams
  /** Chart type identifier */
  chartType: string
  /** Default name for the saved chart */
  defaultName?: string
  /** Optional notes to save with the chart */
  notes?: string
  /** Callback called after successful save */
  onSaved?: () => void
}

export function SaveChartButton({ chartParams, chartType, defaultName = '', notes, onSaved }: SaveChartButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [tags, setTags] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a name for the chart.')
      return
    }

    setLoading(true)
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await fetch('/api/saved-charts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          type: chartType,
          chartData: chartParams,
          notes,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        clientLogger.error('Save chart failed:', { status: res.status, body: text })

        let errorData
        try {
          errorData = JSON.parse(text)
        } catch {
          errorData = { error: text || 'Unknown error' }
        }

        const errorMessage = Array.isArray(errorData.details)
          ? errorData.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join(', ')
          : errorData.details || errorData.error || 'Failed to save chart'

        throw new Error(errorMessage)
      }

      // Parse saved chart ID from response
      const savedChart = await res.json()
      const savedChartId = savedChart.id

      toast.success('Chart saved successfully.')
      setOpen(false)
      onSaved?.()

      // Redirect to saved chart page
      if (savedChartId) {
        router.push(`/saved-calculations/${savedChartId}`)
      }
    } catch (error) {
      clientLogger.error('Error saving chart:', error)
      toast.error('Failed to save chart. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Save Calculation</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Save Calculation</DialogTitle>
          <DialogDescription>
            Save this calculation to access it later from the Saved Calculations sidebar.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g. My Natal Chart"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tags" className="text-right">
              Tags
            </Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="col-span-3"
              placeholder="comma separated tags (e.g. personal, 2024)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
