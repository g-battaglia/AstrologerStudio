import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SolarReturnInput } from '@/lib/validation/planetary-return'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectLocationFields } from '@/components/SubjectLocationFields'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SolarReturnChartFormProps {
  onSubmit: (data: SolarReturnInput) => void
  isLoading?: boolean
}

// Intermediate form values with flat location fields
interface SolarReturnFormValues {
  year: number
  wheel_type: 'single' | 'dual'
  city: string
  nation: string
  latitude: number
  longitude: number
  timezone: string
}

import { z } from 'zod'

// Flat schema for the form
const solarReturnFormSchema = z.object({
  year: z.number().int().min(1900).max(2100),
  wheel_type: z.enum(['single', 'dual']),
  city: z.string().min(1, 'City is required'),
  nation: z.string().min(1, 'Nation is required'),
  longitude: z.number(),
  latitude: z.number(),
  timezone: z.string(),
})

export function SolarReturnChartForm({ onSubmit, isLoading }: SolarReturnChartFormProps) {
  const form = useForm<SolarReturnFormValues>({
    resolver: zodResolver(solarReturnFormSchema),
    defaultValues: {
      year: new Date().getFullYear() + 1,
      wheel_type: 'dual',
      city: '',
      nation: '',
      latitude: 0,
      longitude: 0,
      timezone: '',
    },
  })

  const handleSubmit = (data: SolarReturnFormValues) => {
    const payload: SolarReturnInput = {
      year: data.year,
      wheel_type: data.wheel_type,
      return_location: {
        city: data.city,
        nation: data.nation,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
      },
    }
    onSubmit(payload)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Solar Return Configuration</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

              <FormField
                control={form.control}
                name="wheel_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wheel Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wheel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dual">Dual Wheel (Natal + Return)</SelectItem>
                        <SelectItem value="single">Single Wheel (Return Only)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Return Location</h3>
              <p className="text-sm text-muted-foreground">
                Enter the location where the subject will be (or was) at the time of the solar return.
              </p>

              <SubjectLocationFields
                form={form}
                dialogOpen={false} // Not in a dialog
                idPrefix="solar_return"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Calculating...' : 'Calculate Solar Return'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
