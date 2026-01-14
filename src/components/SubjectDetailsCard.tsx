import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

import type { AstrologicalSubject } from '@/types/birthChart'
import type { EnrichedSubjectModel, ChartData } from '@/types/astrology'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { useUIPreferences } from '@/stores/uiPreferences'
import { useDateFormat, useTimeFormat } from '@/hooks/useDateFormat'
import { formatDisplayDate, formatDisplayTime } from '@/lib/utils/date'

type Props = {
  subject: AstrologicalSubject | ChartData
  className?: string
  dateLabel?: string
  id?: string
  title?: string
}

export default function SubjectDetailsCard({
  subject,
  className,
  dateLabel,
  id = 'subject-details-card',
  title,
}: Props) {
  const contentId = useId()
  const collapsed = useUIPreferences((state) => state.collapsed[id] ?? false)
  const toggleCollapsed = useUIPreferences((state) => state.toggleCollapsed)
  const dateFormat = useDateFormat()
  const timeFormat = useTimeFormat()

  // Normalize data access
  // Check if 'subject' property exists and is an object (ChartData structure)
  const hasNestedSubject = subject && typeof subject === 'object' && 'subject' in subject

  const data = hasNestedSubject ? (subject as ChartData).subject : (subject as AstrologicalSubject)
  const lunar = hasNestedSubject
    ? (subject as ChartData).lunar_phase || (subject as ChartData).subject.lunar_phase
    : (subject as AstrologicalSubject).lunar_phase

  const name = data?.name ?? ''
  const city = data?.city ?? ''
  const nation = data?.nation ?? ''
  const tz_str = data?.tz_str ?? (data as EnrichedSubjectModel)?.timezone ?? ''
  const lat = data?.lat ?? (data as EnrichedSubjectModel)?.latitude
  const lng = data?.lng ?? (data as EnrichedSubjectModel)?.longitude

  const year = data?.year
  const month = data?.month
  const day = data?.day
  const hour = data?.hour ?? 0
  const minute = data?.minute ?? 0

  // Construct a Date object for display purposes.
  // We use Date.UTC to ensure that the date object's UTC methods (which our formatters use)
  // return the exact local values provided (e.g. if birth is 12:00 local, we want 12:00 UTC).
  // This avoids browser timezone shifts when displaying the "Birth date and time".
  let dateObj: Date | null = null

  if (year && month && day) {
    dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute))
  } else if (data?.iso_formatted_local_datetime) {
    // Fallback: expect ISO string to be convertible to UTC components by appending Z if needed
    const iso =
      data.iso_formatted_local_datetime.endsWith('Z') || data.iso_formatted_local_datetime.includes('+')
        ? data.iso_formatted_local_datetime
        : `${data.iso_formatted_local_datetime}Z`
    dateObj = new Date(iso)
  } else if (data?.iso_formatted_utc_datetime) {
    dateObj = new Date(data.iso_formatted_utc_datetime)
  }

  // Verification: if dateObj matches "Invalid Date", try fallback to UTC if we haven't already
  if (dateObj && isNaN(dateObj.getTime())) {
    if (data?.iso_formatted_utc_datetime) {
      dateObj = new Date(data.iso_formatted_utc_datetime)
    }
  }

  // Final check: if still invalid, nullify it so we fall back to raw values or help debug
  if (dateObj && isNaN(dateObj.getTime())) {
    dateObj = null
  }

  const _zodiac_type = data?.zodiac_type ?? ''
  const perspective_type = data?.perspective_type ?? ''
  const houses_system_name = data?.houses_system_name ?? data?.houses_system_identifier ?? ''

  const lunar_phase = lunar

  return (
    <Card className={cn('bg-background/80 backdrop-blur-sm w-full gap-0 py-0', className)}>
      <CardHeader className={cn('flex items-start justify-between gap-2 px-4 py-2.5 pb-2!', !collapsed && 'border-b')}>
        <div className="space-y-1 s">
          <CardTitle>{title || name}</CardTitle>
          <CardDescription>Birth chart</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Espandi dettagli soggetto' : 'Comprimi dettagli soggetto'}
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
          'grid w-full gap-4 px-4 pb-4 transition-[max-height,opacity,padding] duration-200 ease-in-out',
          collapsed ? 'max-h-0 overflow-hidden opacity-0 pt-0 pb-0' : 'max-h-[1000px] opacity-100 pt-3',
        )}
        aria-hidden={collapsed}
      >
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">{dateLabel || 'Birth date and time'}</p>
          <p className="text-xs text-muted-foreground">
            {dateObj
              ? `${formatDisplayDate(dateObj, dateFormat)} ${formatDisplayTime(dateObj, timeFormat)}`
              : `${year}/${month}/${day} @ ${hour}:${String(minute).padStart(2, '0')}`}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">Birth place</p>
          <p className="text-xs text-muted-foreground">
            {city}, {nation}
          </p>
          <p className="text-xs text-muted-foreground">
            Timezone: {tz_str}
            <br />
            Latitude: {lat}°
            <br />
            Longitude: {lng}°
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">Chart details</p>
          <p className="text-xs text-muted-foreground">Perspective: {perspective_type}</p>
          <p className="text-xs text-muted-foreground">House System: {houses_system_name}</p>
        </div>

        {lunar_phase && (
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">Moon Phase</p>
            <p className="text-xs text-muted-foreground">
              Phase Day: {lunar_phase.moon_phase}
              <br />
              {lunar_phase.moon_phase_name} {lunar_phase.moon_emoji}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
