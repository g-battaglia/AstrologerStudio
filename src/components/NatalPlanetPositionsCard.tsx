import { useId, useMemo } from 'react'
import { ChevronDown } from 'lucide-react'

import type { AstrologicalSubject } from '@/types/birthChart'
import type { EnrichedSubjectModel, PointInHouseModel } from '@/types/astrology'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { useUIPreferences } from '@/stores/uiPreferences'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'
import { ALL_CELESTIAL_POINTS } from '@/lib/astrology/celestial-points'

type Props = {
  subject: AstrologicalSubject | EnrichedSubjectModel
  className?: string
  id?: string
  projectedPoints?: PointInHouseModel[]
  title?: string
}

const decimalToDMS = (decimal: number): string => {
  const degrees = Math.floor(decimal)
  const decimalMinutes = (decimal - degrees) * 60
  const minutes = Math.floor(decimalMinutes)
  const seconds = Math.round((decimalMinutes - minutes) * 60)
  return `${degrees}°${minutes}'${seconds}"`
}

// Map house names like "First_House", "Second_House" to numbers
const HOUSE_NAME_TO_NUMBER: Record<string, number> = {
  first_house: 1,
  second_house: 2,
  third_house: 3,
  fourth_house: 4,
  fifth_house: 5,
  sixth_house: 6,
  seventh_house: 7,
  eighth_house: 8,
  ninth_house: 9,
  tenth_house: 10,
  eleventh_house: 11,
  twelfth_house: 12,
}

const getHouseNumber = (houseName: string | null | undefined): string => {
  if (!houseName) return '-'
  const normalized = houseName.toLowerCase().replace(/ /g, '_')
  return HOUSE_NAME_TO_NUMBER[normalized]?.toString() || '-'
}

export default function NatalPlanetPositionsCard({
  subject,
  className,
  id = 'natal-planets-card',
  projectedPoints,
  title = 'Natal Points',
}: Props) {
  const contentId = useId()
  const collapsed = useUIPreferences((state) => state.collapsed[id] ?? false)
  const toggleCollapsed = useUIPreferences((state) => state.toggleCollapsed)

  // Dynamically extract all available points from the subject
  const availablePoints = useMemo(() => {
    const points: Array<{ key: string; name: string; point: import('@/types/astrology').Point }> = []

    // Convert CELESTIAL_POINTS to lowercase with underscores for property access
    ALL_CELESTIAL_POINTS.forEach((pointName) => {
      const propertyKey = pointName.toLowerCase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const point = (subject as any)[propertyKey]

      if (point && typeof point === 'object' && 'position' in point) {
        points.push({
          key: propertyKey,
          name: pointName,
          point,
        })
      }
    })

    return points
  }, [subject])

  return (
    <Card className={cn('bg-background/80 backdrop-blur-sm w-full min-w-[260px] gap-0 py-0', className)}>
      <CardHeader className={cn('flex items-center justify-between gap-2 px-4 py-2.5 pb-2!', !collapsed && 'border-b')}>
        <CardTitle>{title}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? 'Espandi posizioni dei punti' : 'Comprimi posizioni dei punti'}
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
            {availablePoints.map(({ key, name, point }) => {
              // Determine house to display:
              // 1. If projectedPoints is provided, try to find this point there
              // 2. Fallback to point.house
              let houseDisplay = '-'

              if (projectedPoints) {
                const projected = projectedPoints.find(
                  (p) => p.point_name.toLowerCase() === name.toLowerCase() || p.point_name.toLowerCase() === key,
                )
                if (projected && projected.projected_house_number) {
                  houseDisplay = `${projected.projected_house_number}th`
                }
              } else {
                const houseNum = getHouseNumber(point.house)
                houseDisplay = houseNum !== '-' ? `${houseNum}th` : '-'
              }

              return (
                <p key={key} className="text-xs text-muted-foreground grid grid-cols-[6.5rem_1.5rem_3.5rem_3rem]">
                  <span className="capitalize">{formatPlanetName(name)}:</span>
                  <span>{point.emoji}</span>
                  <span>{decimalToDMS(point.position)}</span>
                  <span className="text-right">{houseDisplay}</span>
                </p>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
