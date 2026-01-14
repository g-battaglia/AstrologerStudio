'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'

interface StartDatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
}

export function StartDatePicker({ value, onChange, placeholder = 'Starting from today' }: StartDatePickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = (date: Date | undefined) => {
    onChange(date)
    setOpen(false)
  }

  const handleClear = (e: React.SyntheticEvent) => {
    e.stopPropagation()
    onChange(undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          title={value ? format(value, 'dd MMM yyyy') : placeholder}
          className={cn(
            'h-8 px-2 sm:px-3 gap-1.5 text-xs sm:text-sm shrink-0',
            value && 'text-primary border-primary/50',
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {/* Mobile: short format */}
          <span className="sm:hidden">{value ? format(value, 'dd/MM') : 'Start'}</span>
          {/* Desktop: full format */}
          <span className="hidden sm:inline">{value ? format(value, 'dd MMM yyyy') : 'Start Date'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={value} onSelect={handleSelect} initialFocus />
        {value && (
          <div className="p-2 border-t flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{format(value, 'dd MMM yyyy')}</span>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
