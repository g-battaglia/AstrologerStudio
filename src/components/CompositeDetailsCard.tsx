'use client'

import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

import type { ChartData, EnrichedSubjectModel } from '@/types/astrology'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { useUIPreferences } from '@/stores/uiPreferences'
import { useDateFormat, useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime, DateFormat, TimeFormat } from '@/lib/utils/date'

type Props = {
  chartData: ChartData
  className?: string
  id?: string
  title?: string
}

function SubjectInfo({
  subject,
  label,
  dateFormat,
  timeFormat,
}: {
  subject?: EnrichedSubjectModel
  label: string
  dateFormat: DateFormat
  timeFormat: TimeFormat
}) {
  if (!subject) return null

  const { name, city, nation, latitude, longitude, year, month, day, hour, minute } = subject

  // Construct a Date object for display purposes.
  // We use Date.UTC to ensure that the date object's UTC methods (which our formatters use)
  // return the exact local values provided (e.g. if birth is 12:00 local, we want 12:00 UTC).
  // This avoids browser timezone shifts when displaying the "Birth date and time".
  let dateObj: Date | null = null

  if (year && month && day) {
    dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute))
  } else if (subject.iso_formatted_local_datetime) {
    // Fallback: expect ISO string to be convertible to UTC components by appending Z if needed
    const iso =
      subject.iso_formatted_local_datetime.endsWith('Z') || subject.iso_formatted_local_datetime.includes('+')
        ? subject.iso_formatted_local_datetime
        : `${subject.iso_formatted_local_datetime}Z`
    dateObj = new Date(iso)
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium leading-none text-primary">{label}</p>
      <p className="text-sm font-semibold">{name}</p>
      <div className="text-xs text-muted-foreground">
        <p>
          {dateObj
            ? `${formatDisplayDate(dateObj, dateFormat)} ${formatDisplayTime(dateObj, timeFormat)}`
            : `${year}/${month}/${day} @ ${hour}:${String(minute).padStart(2, '0')}`}
        </p>
        <p>
          {city}, {nation}
        </p>
        <p>
          {latitude?.toFixed(4)}°, {longitude?.toFixed(4)}°
        </p>
      </div>
    </div>
  )
}

export default function CompositeDetailsCard({
  chartData,
  className,
  id = 'composite-details-card',
  title = 'Composite Details',
}: Props) {
  const contentId = useId()
  const collapsed = useUIPreferences((state) => state.collapsed[id] ?? false)
  const toggleCollapsed = useUIPreferences((state) => state.toggleCollapsed)
  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()

  const subject1 = chartData.first_subject
  const subject2 = chartData.second_subject

  return (
    <Card className={cn('bg-background/80 backdrop-blur-sm w-full gap-0 py-0', className)}>
      <CardHeader className={cn('flex items-start justify-between gap-2 px-4 py-2.5 pb-2!', !collapsed && 'border-b')}>
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>Source Subjects</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Espandi dettagli' : 'Comprimi dettagli'}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className={cn(
            'transition-transform hover:bg-transparent dark:hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 active:bg-transparent h-8 w-8',
            collapsed ? 'rotate-180' : '',
          )}
          type="button"
          onClick={() => toggleCollapsed(id)}
        >
          <ChevronDown className="size-4" />
        </Button>
      </CardHeader>

      <CardContent
        id={contentId}
        className={cn(
          'grid w-full gap-6 px-4 pb-4 transition-[max-height,opacity,padding] duration-200 ease-in-out',
          collapsed ? 'max-h-0 overflow-hidden opacity-0 pt-0 pb-0' : 'max-h-[1000px] opacity-100 pt-3',
        )}
        aria-hidden={collapsed}
      >
        <div className="flex flex-col gap-4">
          <SubjectInfo subject={subject1} label="Subject 1" dateFormat={dateFormat} timeFormat={timeFormat} />
          <SubjectInfo subject={subject2} label="Subject 2" dateFormat={dateFormat} timeFormat={timeFormat} />
        </div>
      </CardContent>
    </Card>
  )
}
