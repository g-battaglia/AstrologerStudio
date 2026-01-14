import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db/prisma'
import { getSession } from '@/lib/security/session'
import type { SavedChartParams } from '@/types/saved-chart-params'
import { SavedChartViewer } from './SavedChartViewer'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SavedChartViewerPage({ params }: PageProps) {
  const session = await getSession()
  if (!session) {
    return <div>Please log in to view saved charts.</div>
  }

  const { id } = await params

  const savedChart = await prisma.savedChart.findUnique({
    where: { id },
  })

  if (!savedChart || savedChart.userId !== session.userId) {
    notFound()
  }

  // Parse stored parameters
  const chartParams = JSON.parse(savedChart.chartData) as SavedChartParams

  // Check if valid new format (has 'type' field)
  if (!chartParams.type) {
    return (
      <div className="p-4 text-destructive">
        This saved chart uses an old format. Please delete it and save a new one.
      </div>
    )
  }

  return (
    <SavedChartViewer
      chartName={savedChart.name}
      chartParams={chartParams}
      savedChartId={savedChart.id}
      initialNotes={savedChart.notes || ''}
    />
  )
}
