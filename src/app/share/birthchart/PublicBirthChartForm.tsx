'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Clock, Loader2 } from 'lucide-react'
import { SubjectLocationFields } from '@/components/SubjectLocationFields'

// Schema for the public birth chart form (simplified from CreateSubjectInput)
const publicBirthChartSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  birthDate: z.string().min(1, 'Birth date is required'),
  birthTime: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  nation: z.string().min(1, 'Country is required'),
  latitude: z.number(),
  longitude: z.number(),
  timezone: z.string(),
})

type PublicBirthChartFormData = z.infer<typeof publicBirthChartSchema>

interface PublicBirthChartFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    year: number
    month: number
    day: number
    hour: number
    minute: number
    city: string
    nation: string
    latitude: number
    longitude: number
    timezone: string
  }) => void
}

export function PublicBirthChartForm({ open, onOpenChange, onSubmit }: PublicBirthChartFormProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PublicBirthChartFormData>({
    resolver: zodResolver(publicBirthChartSchema),
    defaultValues: {
      name: '',
      birthDate: '',
      birthTime: '',
      city: '',
      nation: '',
      latitude: 0,
      longitude: 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  })

  const nameRegister = form.register('name')

  const handleFormSubmit = form.handleSubmit((values) => {
    setIsSubmitting(true)

    // Parse date and time
    const date = new Date(values.birthDate)
    const [hourStr, minuteStr] = (values.birthTime || '12:00').split(':')
    const hour = parseInt(hourStr || '12', 10)
    const minute = parseInt(minuteStr || '0', 10)

    onSubmit({
      name: values.name,
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour,
      minute,
      city: values.city,
      nation: values.nation,
      latitude: values.latitude,
      longitude: values.longitude,
      timezone: values.timezone,
    })

    setIsSubmitting(false)
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full sm:max-w-xl md:max-w-4xl max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          requestAnimationFrame(() => nameInputRef.current?.focus())
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">Create Your Birth Chart</DialogTitle>
          <DialogDescription>Enter your birth details to generate your personalized natal chart.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 mt-2 px-1">
          {/* Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" htmlFor="public_name">
              Name
            </label>
            <input
              id="public_name"
              className="border rounded px-3 py-2 text-sm bg-background"
              placeholder="e.g. Your Name"
              {...nameRegister}
              ref={(el) => {
                nameRegister.ref(el)
                nameInputRef.current = el
              }}
              disabled={isSubmitting}
            />
            {form.formState.errors.name && (
              <span className="text-xs text-destructive">{form.formState.errors.name.message}</span>
            )}
          </div>

          {/* Date and Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="public_birthDate">
                Birth Date
              </label>
              <input
                id="public_birthDate"
                type="date"
                className="border rounded px-3 py-2 text-sm bg-background w-full"
                value={(() => {
                  const v = form.watch('birthDate')
                  if (!v) return ''
                  const d = new Date(v)
                  if (isNaN(d.getTime())) return ''
                  return d.toISOString().split('T')[0]
                })()}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    form.setValue('birthDate', '')
                  } else {
                    const d = new Date(value)
                    form.setValue('birthDate', d.toISOString())
                  }
                }}
                disabled={isSubmitting}
              />
              {form.formState.errors.birthDate && (
                <span className="text-xs text-destructive">{form.formState.errors.birthDate.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="public_birthTime">
                Birth Time
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="public_birthTime"
                  type="time"
                  className="border rounded pl-10 pr-3 py-2 text-sm bg-background w-full"
                  value={form.watch('birthTime') ?? ''}
                  onChange={(e) => {
                    form.setValue('birthTime', e.target.value || undefined)
                  }}
                  disabled={isSubmitting}
                />
              </div>
              {form.formState.errors.birthTime && (
                <span className="text-xs text-destructive">{form.formState.errors.birthTime.message}</span>
              )}
            </div>
          </div>

          {/* Location Fields */}
          <SubjectLocationFields form={form} disabled={isSubmitting} dialogOpen={open} idPrefix="public" />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Chart'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
