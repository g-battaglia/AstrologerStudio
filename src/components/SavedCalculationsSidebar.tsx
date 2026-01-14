'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clientLogger } from '@/lib/logging/client'

type SavedChart = {
  id: string
  name: string
  type: string
  createdAt: string
  interpretation?: string
}

export function SavedCalculationsSidebar() {
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([])
  const [loading, setLoading] = useState(true)
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
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this chart?')) return

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
  }

  const handleLoadChart = (chart: SavedChart) => {
    // Navigate to chart page with saved chart ID
    router.push(`/saved-calculations/${chart.id}`)
  }

  const chartTypes = Array.from(new Set(savedCharts.map((c) => c.type)))

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Saved Calculations</h2>
      </div>

      {savedCharts.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">No saved calculations yet.</div>
      ) : (
        <Tabs defaultValue={chartTypes[0] || 'all'} className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="w-full justify-start overflow-x-auto">
              {chartTypes.map((type) => (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="capitalize data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
                >
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {chartTypes.map((type) => (
            <TabsContent key={type} value={type} className="flex-1 p-0 overflow-hidden">
              <div className="h-[calc(100vh-200px)] overflow-y-auto">
                <div className="p-4 space-y-2">
                  {savedCharts
                    .filter((c) => c.type === type)
                    .map((chart) => (
                      <Card
                        key={chart.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleLoadChart(chart)}
                      >
                        <CardContent className="p-3 flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">{chart.name}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(chart.createdAt), 'PP p')}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleDelete(chart.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
