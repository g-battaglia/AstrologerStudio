'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectLocationFields } from '@/components/SubjectLocationFields'
import { SolarReturnInput } from '@/lib/validation/planetary-return'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { PlanetaryReturnRequestOptions } from '@/types/astrology'

interface SolarReturnNavigatorProps {
  defaultValues: SolarReturnInput
  onCalculate: (data: SolarReturnInput, options?: Partial<PlanetaryReturnRequestOptions>) => void
  isLoading?: boolean
  wheelType: 'single' | 'dual'
  onWheelTypeChange: (value: 'single' | 'dual') => void
  currentReturnDatetime?: string
}

// Flat schema for the form
const solarReturnFormSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  city: z.string().min(1, 'City is required'),
  nation: z.string().min(1, 'Nation is required'),
  longitude: z.number(),
  latitude: z.number(),
  timezone: z.string(),
})

type SolarReturnFormValues = z.infer<typeof solarReturnFormSchema>

export function SolarReturnNavigator({
  defaultValues,
  onCalculate,
  isLoading,
  wheelType,
  onWheelTypeChange,
}: SolarReturnNavigatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stepAmount, setStepAmount] = useState(1)

  const form = useForm<SolarReturnFormValues>({
    resolver: zodResolver(solarReturnFormSchema),
    defaultValues: {
      year: defaultValues.year,
      city: defaultValues.return_location?.city || '',
      nation: defaultValues.return_location?.nation || '',
      latitude: defaultValues.return_location?.latitude || 0,
      longitude: defaultValues.return_location?.longitude || 0,
      timezone: defaultValues.return_location?.timezone || '',
    },
  })

  const triggerUpdate = (newYear: number) => {
    const currentValues = form.getValues()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { year, ...rest } = currentValues

    const payload: SolarReturnInput = {
      year: newYear,
      wheel_type: wheelType,
      return_location: {
        city: rest.city,
        nation: rest.nation,
        latitude: rest.latitude,
        longitude: rest.longitude,
        timezone: rest.timezone,
      },
    }
    onCalculate(payload)
  }

  const handleStep = (direction: 'forward' | 'backward') => {
    const currentYear = form.getValues('year')
    const newYear = direction === 'forward' ? currentYear + stepAmount : currentYear - stepAmount

    form.setValue('year', newYear)
    triggerUpdate(newYear)
  }

  const handleCurrentYear = () => {
    const currentYear = new Date().getFullYear()
    form.setValue('year', currentYear)
    triggerUpdate(currentYear)
  }

  const handleSubmit = (data: SolarReturnFormValues) => {
    const payload: SolarReturnInput = {
      year: data.year,
      wheel_type: wheelType,
      return_location: {
        city: data.city,
        nation: data.nation,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      },
    }
    onCalculate(payload)
  }

  return (
    <Card className="w-full p-4">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Navigation Controls (Always Visible) */}
            <div className="flex flex-nowrap items-center gap-1 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStep('backward')}
                title="Previous Year"
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex items-center border rounded-md px-2 sm:px-3 h-9 bg-background">
                  <span className="font-medium">{form.watch('year')}</span>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={stepAmount}
                  onChange={(e) => setStepAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 h-9 text-center"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleStep('forward')}
                title="Next Year"
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <div className="ml-auto flex items-center gap-0 sm:gap-2">
                <div className="hidden md:block">
                  <Select value={wheelType} onValueChange={(value: 'single' | 'dual') => onWheelTypeChange(value)}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Wheel Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual">Dual Wheel</SelectItem>
                      <SelectItem value="single">Single Wheel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="button" variant="ghost" size="sm" onClick={handleCurrentYear} className="h-9">
                  <RotateCcw className="md:mr-2 h-3 w-3" />
                  <span className="hidden md:inline">Current Year</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  <ChevronLeft className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : '-rotate-90'}`} />
                </Button>
              </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="space-y-6 pt-4 border-t border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Year</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Return Location</h3>
                  <SubjectLocationFields form={form} dialogOpen={false} idPrefix="solar_return_nav" />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Play className="mr-2 h-4 w-4" />
                  {isLoading ? 'Calculating...' : 'Calculate Solar Return'}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
