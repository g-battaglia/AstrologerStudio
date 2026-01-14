'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { findOrCreateSubject } from '@/actions/subjects'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { PublicBirthData } from '@/actions/public-astrology'

/**
 * Decode base64 encoded chart data from URL
 */
function decodeChartData(encoded: string): PublicBirthData | null {
  try {
    const decoded = atob(encoded)
    return JSON.parse(decoded) as PublicBirthData
  } catch {
    return null
  }
}

/**
 * Save Subject Page
 *
 * This page is accessed after registration/login from the public birth chart page.
 * It automatically saves the chart data as a subject and redirects to the natal chart view.
 */
export default function SaveSubjectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const saveSubject = async () => {
      const chartParam = searchParams.get('data')

      if (!chartParam) {
        setStatus('error')
        setErrorMessage('No chart data provided')
        return
      }

      const chartData = decodeChartData(chartParam)

      if (!chartData) {
        setStatus('error')
        setErrorMessage('Invalid chart data')
        return
      }

      try {
        // Convert PublicBirthData to CreateSubjectInput format
        const birthDate = `${chartData.year}-${String(chartData.month).padStart(2, '0')}-${String(chartData.day).padStart(2, '0')}`
        const birthTime = `${String(chartData.hour).padStart(2, '0')}:${String(chartData.minute).padStart(2, '0')}:00`

        const subject = await findOrCreateSubject({
          name: chartData.name || 'Unnamed Subject',
          birthDate,
          birthTime,
          city: chartData.city,
          nation: chartData.nation,
          latitude: chartData.latitude,
          longitude: chartData.longitude,
          timezone: chartData.timezone,
        })

        toast.success('Subject saved successfully!')

        // Redirect to the natal chart view for this subject
        router.replace(`/subjects/${subject.id}/natal`)
      } catch (error) {
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Failed to save subject')
      }
    }

    saveSubject()
  }, [searchParams, router])

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-destructive text-lg font-medium">Error</div>
        <p className="text-muted-foreground">{errorMessage}</p>
        <button onClick={() => router.push('/subjects')} className="text-primary underline hover:no-underline">
          Go to Subjects
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Saving your chart...</p>
    </div>
  )
}
