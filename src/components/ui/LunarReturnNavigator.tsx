'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Calculator, Calendar as CalendarIcon, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectLocationFields } from '@/components/SubjectLocationFields'
import { LunarReturnInput } from '@/lib/validation/planetary-return'
import { Form, FormField, FormLabel } from '@/components/ui/form'
import { PlanetaryReturnRequestOptions } from '@/types/astrology'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'
import { useDateFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate } from '@/lib/utils/date'

interface LunarReturnNavigatorProps {
  defaultValues: LunarReturnInput
  onCalculate: (data: LunarReturnInput, options?: Partial<PlanetaryReturnRequestOptions>) => void
  isLoading?: boolean
  wheelType: 'single' | 'dual'
  onWheelTypeChange: (value: 'single' | 'dual') => void
  /** Current return's ISO datetime - used for next/prev navigation */
  currentReturnDatetime?: string
}

const lunarReturnFormSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31).optional(),
  city: z.string().min(1, 'City is required'),
  nation: z.string().min(1, 'Nation is required'),
  longitude: z.number(),
  latitude: z.number(),
  timezone: z.string(),
})

type LunarReturnFormValues = z.infer<typeof lunarReturnFormSchema>

export function LunarReturnNavigator({
  defaultValues,
  onCalculate,
  isLoading,
  wheelType,
  onWheelTypeChange,
  currentReturnDatetime,
}: LunarReturnNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const dateFormat = useDateFormat()

  const form = useForm<LunarReturnFormValues>({
    resolver: zodResolver(lunarReturnFormSchema),
    defaultValues: {
      year: defaultValues.year,
      month: defaultValues.month,
      day: defaultValues.day || 1,
      city: defaultValues.return_location?.city || '',
      nation: defaultValues.return_location?.nation || '',
      latitude: defaultValues.return_location?.latitude || 0,
      longitude: defaultValues.return_location?.longitude || 0,
      timezone: defaultValues.return_location?.timezone || '',
    },
  })

  const buildPayload = (values: LunarReturnFormValues): LunarReturnInput => {
    return {
      year: values.year,
      month: values.month,
      day: values.day,
      wheel_type: wheelType,
      return_location: {
        city: values.city,
        nation: values.nation,
        latitude: values.latitude,
        longitude: values.longitude,
        timezone: values.timezone,
      },
    }
  }

  const handleSubmit = (data: LunarReturnFormValues) => {
    const targetDate = new Date(data.year, data.month - 1, data.day || 1)
    onCalculate(buildPayload(data), { iso_datetime: targetDate.toISOString() })
  }

  const handleStep = (direction: 'forward' | 'backward') => {
    let baseDate: Date
    if (currentReturnDatetime) {
      baseDate = new Date(currentReturnDatetime)
      if (direction === 'forward') {
        // Add 27 days to jump to approximately the next return
        baseDate.setDate(baseDate.getDate() + 27)
      } else {
        // Subtract 29 days to ensure we land BEFORE the previous return
        // (Lunar returns are ~27-28 days apart, so -29 ensures we don't get the same return)
        baseDate.setDate(baseDate.getDate() - 29)
      }
    } else {
      baseDate = new Date(form.getValues('year'), form.getValues('month') - 1, form.getValues('day') || 1)
      if (direction === 'forward') {
        baseDate.setMonth(baseDate.getMonth() + 1)
      } else {
        baseDate.setMonth(baseDate.getMonth() - 1)
      }
    }

    form.setValue('year', baseDate.getFullYear())
    form.setValue('month', baseDate.getMonth() + 1)
    form.setValue('day', baseDate.getDate())

    const values = form.getValues()
    onCalculate(buildPayload(values), { iso_datetime: baseDate.toISOString() })
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    form.setValue('year', now.getFullYear())
    form.setValue('month', now.getMonth() + 1)
    form.setValue('day', now.getDate())

    const values = form.getValues()
    onCalculate(buildPayload(values), { iso_datetime: now.toISOString() })
  }

  const displayDate = useMemo(() => {
    if (currentReturnDatetime) {
      return formatDisplayDate(currentReturnDatetime, dateFormat)
    }
    return 'Select Date'
  }, [currentReturnDatetime, dateFormat])

  return (
    <Card className="w-full p-4">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex flex-nowrap items-center justify-between gap-2 overflow-hidden">
              {/* Smart Navigation */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => handleStep('backward')}
                  disabled={isLoading}
                  title="Previous Return"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1 min-w-0">
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'h-9 justify-start text-left font-normal px-2 sm:px-3 w-[110px] sm:w-[200px]',
                          !currentReturnDatetime && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 hidden sm:block" />
                        <span className="truncate text-xs sm:text-sm">{displayDate}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-4">
                        <h4 className="font-medium">Jump to Date</h4>
                        <div className="flex gap-2">
                          <FormField
                            control={form.control}
                            name="month"
                            render={({ field }) => (
                              <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                                <SelectTrigger className="w-[110px]">
                                  <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                    <SelectItem key={m} value={m.toString()}>
                                      {new Date(0, m - 1).toLocaleString('default', { month: 'short' })}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="year"
                            render={({ field }) => (
                              <Input
                                type="number"
                                className="w-[100px]"
                                value={field.value}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            )}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            form.handleSubmit(handleSubmit)()
                            setIsDatePickerOpen(false)
                          }}
                        >
                          Go
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => handleStep('forward')}
                  disabled={isLoading}
                  title="Next Return"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCurrentMonth}
                  className="h-9 w-9"
                  title="Current Month"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>

                <div className="hidden sm:block">
                  <Select value={wheelType} onValueChange={(value: 'single' | 'dual') => onWheelTypeChange(value)}>
                    <SelectTrigger className="w-[120px] h-9">
                      <SelectValue placeholder="Wheel Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual">Bi-Wheel</SelectItem>
                      <SelectItem value="single">Single</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronLeft
                    className={cn('h-4 w-4 transition-transform', isExpanded ? 'rotate-90' : '-rotate-90')}
                  />
                </Button>
              </div>
            </div>

            {/* Extended Settings */}
            {isExpanded && (
              <div className="pt-4 border-t mt-4 animate-in slide-in-from-top-2 duration-200">
                <div className="grid gap-4">
                  {/* Wheel Type Mobile Only */}
                  <div className="block sm:hidden space-y-2">
                    <FormLabel>Wheel Type</FormLabel>
                    <Select value={wheelType} onValueChange={(value: 'single' | 'dual') => onWheelTypeChange(value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Wheel Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dual">Bi-Wheel</SelectItem>
                        <SelectItem value="single">Single</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <h3 className="font-medium text-sm text-muted-foreground">Return Location</h3>
                  <SubjectLocationFields form={form} dialogOpen={false} idPrefix="lunar_return_nav" />
                  <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
                    <Calculator className="mr-2 h-4 w-4" />
                    Recalculate
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
