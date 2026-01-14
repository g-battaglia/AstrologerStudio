import { useId } from 'react'
import { ChevronDown } from 'lucide-react'

import type { AstrologicalSubject } from '@/types/birthChart'
import type { EnrichedSubjectModel } from '@/types/astrology'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { useUIPreferences } from '@/stores/uiPreferences'

type Props = {
  subject: AstrologicalSubject | EnrichedSubjectModel
  className?: string
  id?: string
  title?: string
}

const houseKeys = [
  'first_house',
  'second_house',
  'third_house',
  'fourth_house',
  'fifth_house',
  'sixth_house',
  'seventh_house',
  'eighth_house',
  'ninth_house',
  'tenth_house',
  'eleventh_house',
  'twelfth_house',
] as const

type HouseKey = (typeof houseKeys)[number]

const label = (key: HouseKey) => key.replace('_', ' ').replace('_', ' ')

const decimalToDMS = (decimal: number): string => {
  const degrees = Math.floor(decimal)
  const minutesFloat = (decimal - degrees) * 60
  const minutes = Math.floor(minutesFloat)
  const seconds = ((minutesFloat - minutes) * 60).toFixed(0)
  return `${degrees}° ${minutes}' ${seconds}"`
}

export default function NatalHousesPositionsCard({
  subject,
  className,
  id = 'natal-houses-card',
  title = 'Natal Houses',
}: Props) {
  const contentId = useId()
  const collapsed = useUIPreferences((state) => state.collapsed[id] ?? false)
  const toggleCollapsed = useUIPreferences((state) => state.toggleCollapsed)

  if (!subject) return null

  return (
    <Card className={cn('bg-background/80 backdrop-blur-sm w-full min-w-[260px] gap-0 py-0', className)}>
      <CardHeader className={cn('flex items-center justify-between gap-2 px-4 py-2.5 pb-2!', !collapsed && 'border-b')}>
        <CardTitle>{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Espandi posizioni delle case' : 'Comprimi posizioni delle case'}
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
        <div className="w-full">
          <div className="space-y-1 flex flex-col">
            {houseKeys.map((key) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const h = (subject as any)[key]
              if (!h) return null
              return (
                <p key={key} className="text-xs text-muted-foreground grid grid-cols-[8rem_2rem_5rem]">
                  <span className="capitalize">{label(key)}:</span>
                  <span>{h.emoji}</span>
                  <span>{decimalToDMS(h.position)}</span>
                </p>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
