'use client'

import { ChartErrorState } from '@/components/ChartErrorState'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getNowChart, getNatalChart } from '@/actions/astrology'
import { NatalChart } from '@/components/charts/NatalChart'
import { Skeleton } from '@/components/ui/skeleton'
import { useTheme } from '@/components/ThemeProvider'
import { createSubject } from '@/lib/api/subjects'
import type { CreateSubjectInput, Subject } from '@/types/subjects'
import type { ChartResponse } from '@/types/astrology'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DateTimeLocationSelector } from '@/components/ui/DateTimeLocationSelector'
import type { LocationFormValues } from '@/components/SubjectLocationFields'
import { Tabs } from '@/components/ui/tabs'
import { ChartTabsList } from '@/components/charts/ChartTabs'
import { isAIGloballyEnabled } from '@/lib/ai/feature-flags'
import { Save } from 'lucide-react'
import { ExportPDFDialog } from '@/components/pdf'
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
import { useDateFormat, useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'

function mapNowChartToSubjectInput(chart: ChartResponse): CreateSubjectInput {
  const subject = chart.chart_data?.subject
  if (!subject) {
    throw new Error('Missing subject data from chart')
  }

  const iso = subject.iso_formatted_utc_datetime || subject.iso_formatted_local_datetime
  const date = iso ? new Date(iso) : new Date()

  const birthTime = [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    .map((v) => String(v).padStart(2, '0'))
    .join(':')

  const latitude = subject.latitude
  const longitude = subject.longitude

  return {
    name: subject.name || 'Now Chart',
    city: subject.city || 'Greenwich',
    nation: subject.nation || 'GB',
    birthDate: date.toISOString(),
    birthTime,
    timezone: subject.timezone || 'UTC',
    latitude,
    longitude,
    rodens_rating: null,
    tags: ['now'],
  }
}

export function NowChartView() {
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'classic'
  const queryClient = useQueryClient()
  const [override, setOverride] = useState<{ dateTime: string; location: LocationFormValues } | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [notes, setNotes] = useState('')
  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['now-chart', chartTheme, override],
    queryFn: () => {
      if (override) {
        const overrideSubject: Subject = {
          id: 'now-override',
          name: 'Now Chart',
          birth_datetime: override.dateTime,
          city: override.location.city ?? '',
          nation: override.location.nation ?? '',
          latitude: override.location.latitude ?? 0,
          longitude: override.location.longitude ?? 0,
          timezone: override.location.timezone ?? '0',
          ownerId: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        return getNatalChart(overrideSubject, { theme: chartTheme })
      }
      return getNowChart({ theme: chartTheme })
    },
    // Fresh chart on initial page load only - no auto-refresh on window focus
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  })

  const saveMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!data) throw new Error('Nessun dato chart disponibile')
      const payload = mapNowChartToSubjectInput(data)
      return createSubject({ ...payload, name, notes })
    },
    onSuccess: (subject) => {
      toast.success('Chart saved successfully', { description: subject.name })
      queryClient.invalidateQueries({ queryKey: ['subjects', { count: 50 }] }).catch(() => {})
      setIsSaveDialogOpen(false)
      setSaveName('')
    },
    onError: (err) => {
      toast.error('Error saving chart', { description: (err as Error).message })
    },
  })

  const handleSave = () => {
    if (!saveName.trim()) return
    saveMutation.mutate(saveName)
  }

  if (isLoading) {
    return (
      <div className="space-y-8 p-0 md:p-2">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-0 md:p-2">
        <ChartErrorState title="Error loading chart" error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  // Extract current values for the selector defaults
  const currentSubject = data.chart_data?.subject
  const currentDateTime = override
    ? override.dateTime
    : currentSubject?.iso_formatted_local_datetime || new Date().toISOString()

  const currentLocation: LocationFormValues = override
    ? override.location
    : {
        city: currentSubject?.city || '',
        nation: currentSubject?.nation || '',
        latitude: currentSubject?.latitude ?? 0,
        longitude: currentSubject?.longitude ?? 0,
        timezone: currentSubject?.timezone || 'UTC',
      }

  return (
    <Tabs defaultValue="chart" className="space-y-3 p-0 md:p-2 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Now Chart</h1>
          <p className="text-muted-foreground">
            {formatDisplayDate(currentDateTime, dateFormat)} {formatDisplayTime(currentDateTime, timeFormat)} •{' '}
            {currentLocation.city}, {currentLocation.nation}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <ChartTabsList hasData={true} hasInterpretation={isAIGloballyEnabled()} />

          <div className="flex items-center gap-2 ml-auto">
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="whitespace-nowrap">
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save as Subject</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Chart as Subject</DialogTitle>
                  <DialogDescription>Enter a name for this chart to save it to your subjects list.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g., Event Start"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSave} disabled={saveMutation.isPending || !saveName.trim()}>
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {data && (
              <ExportPDFDialog
                chartData={data.chart_data}
                aspects={data.chart_data.aspects}
                chartWheelHtml={data.chart_wheel}
                variant="outline"
                size="icon"
              />
            )}
          </div>
        </div>
      </div>

      <DateTimeLocationSelector
        defaultDateTime={currentDateTime}
        defaultLocation={currentLocation}
        onCalculate={setOverride}
        submitLabel="Update Now Chart"
      />

      <div className={isFetching ? 'opacity-50 transition-opacity duration-200' : ''}>
        <NatalChart data={data} subjectId="now-chart" notes={notes} onNotesChange={setNotes} />
      </div>
    </Tabs>
  )
}
