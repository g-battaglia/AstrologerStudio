'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { add, sub, format, parseISO } from 'date-fns'
import { Calendar, Clock, RotateCcw, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectLocationFields, type LocationFormValues } from '@/components/SubjectLocationFields'

interface DateTimeLocationSelectorProps {
  defaultDateTime: string
  defaultLocation: LocationFormValues
  onCalculate: (data: { dateTime: string; location: LocationFormValues }) => void
  submitLabel?: string
  showNowButton?: boolean
}

type TimeUnit = 'minutes' | 'hours' | 'days' | 'months' | 'years'

export function DateTimeLocationSelector({
  defaultDateTime,
  defaultLocation,
  onCalculate,
  submitLabel = 'Calculate',
  showNowButton = true,
}: DateTimeLocationSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stepAmount, setStepAmount] = useState(1)
  const [stepUnit, setStepUnit] = useState<TimeUnit>('days')

  const form = useForm<LocationFormValues & { date: string; time: string }>({
    defaultValues: {
      ...defaultLocation,
      date: format(new Date(defaultDateTime), 'yyyy-MM-dd'),
      time: format(new Date(defaultDateTime), 'HH:mm'),
    },
  })

  // Sync form values when defaultLocation changes (e.g., after form submission)
  // Using JSON.stringify for stable dependency to prevent infinite loops
  const locationKey = JSON.stringify(defaultLocation)
  useEffect(() => {
    const currentCity = form.getValues('city')
    const currentLat = form.getValues('latitude')

    // Only reset if location actually changed (to avoid unnecessary updates)
    if (currentCity !== defaultLocation.city || currentLat !== defaultLocation.latitude) {
      form.reset({
        ...defaultLocation,
        date: format(new Date(defaultDateTime), 'yyyy-MM-dd'),
        time: format(new Date(defaultDateTime), 'HH:mm'),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationKey, defaultDateTime])

  const triggerUpdate = (newDate: string, newTime: string) => {
    const currentValues = form.getValues()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { date, time, ...location } = currentValues
    // Use the new date/time but keep the current location
    const dateTime = `${newDate}T${newTime}:00`
    onCalculate({
      dateTime,
      location: location as LocationFormValues,
    })
  }

  const handleNow = () => {
    const now = new Date()
    const newDate = format(now, 'yyyy-MM-dd')
    const newTime = format(now, 'HH:mm')
    form.setValue('date', newDate)
    form.setValue('time', newTime)
    triggerUpdate(newDate, newTime)
  }

  const handleReset = () => {
    const resetDate = format(new Date(defaultDateTime), 'yyyy-MM-dd')
    const resetTime = format(new Date(defaultDateTime), 'HH:mm')
    // Reset form to original defaults
    form.reset({
      ...defaultLocation,
      date: resetDate,
      time: resetTime,
    })
    // Trigger update with original values
    onCalculate({
      dateTime: `${resetDate}T${resetTime}:00`,
      location: defaultLocation,
    })
  }

  const handleStep = (direction: 'forward' | 'backward') => {
    const dateStr = form.getValues('date')
    const timeStr = form.getValues('time')
    if (!dateStr || !timeStr) return

    const currentDateTime = parseISO(`${dateStr}T${timeStr}`)
    const duration = { [stepUnit]: stepAmount }
    const newDateTime = direction === 'forward' ? add(currentDateTime, duration) : sub(currentDateTime, duration)

    const newDate = format(newDateTime, 'yyyy-MM-dd')
    const newTime = format(newDateTime, 'HH:mm')

    form.setValue('date', newDate)
    form.setValue('time', newTime)
    triggerUpdate(newDate, newTime)
  }

  const onSubmit = (data: LocationFormValues & { date: string; time: string }) => {
    const { date, time, ...location } = data
    // Construct ISO string. Note: This is "local" time as per the inputs.
    // The backend/calculation logic should handle timezone conversion using the 'timezone' field.
    const dateTime = `${date}T${time}:00`

    onCalculate({
      dateTime,
      location,
    })
  }

  return (
    <Card className="w-full p-4">
      <CardContent className="p-0">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Time Travel Controls (Always Visible) */}
          <div className="flex flex-nowrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStep('backward')}
              title="Step Backward"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 sm:gap-2">
              <Input
                type="number"
                min={1}
                value={stepAmount}
                onChange={(e) => setStepAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-9 text-center"
              />
              <Select value={stepUnit} onValueChange={(v) => setStepUnit(v as TimeUnit)}>
                <SelectTrigger className="w-16 sm:w-28 h-9">
                  <span className="sm:hidden">
                    {stepUnit === 'minutes' && 'Min'}
                    {stepUnit === 'hours' && 'Hr'}
                    {stepUnit === 'days' && 'Dy'}
                    {stepUnit === 'months' && 'Mo'}
                    {stepUnit === 'years' && 'Yr'}
                  </span>
                  <span className="hidden sm:inline">
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                  <SelectItem value="years">Years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleStep('forward')}
              title="Step Forward"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="ml-auto flex items-center gap-0 sm:gap-1">
              {showNowButton ? (
                <Button type="button" variant="ghost" size="sm" onClick={handleNow} className="h-9" title="Go to now">
                  <RotateCcw className="md:mr-2 h-3 w-3" />
                  <span className="hidden md:inline">Now</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-9"
                  title="Reset to original"
                >
                  <RotateCcw className="md:mr-2 h-3 w-3" />
                  <span className="hidden md:inline">Reset</span>
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronLeft className="h-4 w-4 rotate-90" />
                ) : (
                  <ChevronLeft className="h-4 w-4 -rotate-90" />
                )}
              </Button>
            </div>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="space-y-6 pt-2 border-t border-border/50">
              {/* Date & Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Date
                  </label>
                  <Input type="date" {...form.register('date')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Time
                  </label>
                  <Input type="time" {...form.register('time')} />
                </div>
              </div>

              {/* Location Fields */}
              <SubjectLocationFields form={form} dialogOpen={true} idPrefix="dt_selector" />

              <Button type="submit" className="w-full">
                <Play className="mr-2 h-4 w-4" />
                {submitLabel}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
