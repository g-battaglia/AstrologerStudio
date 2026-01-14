'use client'

import * as React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils/cn'

export type TimeRange = 'week' | 'month' | 'year'

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  className?: string
}

export function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  // Use stable ID to prevent hydration mismatch with Radix Select
  const id = React.useId()

  return (
    <Select value={value} onValueChange={(v) => onChange(v as TimeRange)}>
      <SelectTrigger id={`time-range-${id}`} size="sm" className={cn('text-xs sm:text-sm', className)}>
        <SelectValue placeholder="Range" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week">Next Week</SelectItem>
        <SelectItem value="month">Next Month</SelectItem>
        <SelectItem value="year">Next Year</SelectItem>
      </SelectContent>
    </Select>
  )
}
