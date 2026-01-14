'use client'

import { useMemo, useState, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TransitDayData } from '@/lib/api/transits'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMediaQuery } from '@/hooks/use-media-query'

import type { EnrichedSubjectModel, Point, Aspect } from '@/types/astrology'
import { ASPECT_SYMBOLS } from '@/lib/astrology/aspects'
import { formatPlanetName, formatPlanetNameShort } from '@/lib/astrology/planet-formatting'
import { AspectTooltipContent } from '@/components/charts/AspectTooltipContent'

interface TimelineEventTableProps {
  transitData: TransitDayData[]
  subjectId: string
  selectedTransitPlanets: string[]
  selectedNatalPlanets: string[]
  selectedAspects: string[]
  natalSubject: EnrichedSubjectModel
  filters?: React.ReactNode
}

// Helper to get color based on aspect type
function getAspectColor(aspectName: string): string {
  const name = aspectName.toLowerCase()

  if (name === 'conjunction') return 'bg-blue-500'
  if (name === 'opposition') return 'bg-red-500'
  if (name === 'square') return 'bg-red-500'
  if (name === 'trine') return 'bg-green-500'
  if (name === 'sextile') return 'bg-green-500'

  if (name === 'semi-sextile') return 'bg-blue-400'
  if (name === 'semi-square' || name === 'sesquiquadrate') return 'bg-red-400'
  if (name === 'quincunx') return 'bg-purple-500'
  if (name === 'quintile' || name === 'bi-quintile' || name === 'biquintile') return 'bg-orange-500'

  return 'bg-gray-500'
}

// Helper to get text color for the symbol
function getAspectTextColor(aspectName: string): string {
  const name = aspectName.toLowerCase()

  if (name === 'conjunction') return 'text-blue-600'
  if (name === 'opposition') return 'text-red-600'
  if (name === 'square') return 'text-red-600'
  if (name === 'trine') return 'text-green-600'
  if (name === 'sextile') return 'text-green-600'

  if (name === 'semi-sextile') return 'text-blue-500'
  if (name === 'semi-square' || name === 'sesquiquadrate') return 'text-red-500'
  if (name === 'quincunx') return 'text-purple-500'
  if (name === 'quintile' || name === 'bi-quintile' || name === 'biquintile') return 'text-orange-600'

  return 'text-gray-600'
}

// Helper to get text size for the symbol to normalize visual weight
function getAspectTextSize(aspectName: string): string {
  const name = aspectName.toLowerCase()
  if (name === 'biquintile' || name === 'bi-quintile') return 'text-xs' // bQ is naturally large
  if (name === 'opposition') return 'text-xl' // Opposition is naturally small
  return 'text-lg' // Default size
}

// Helper to get aspect symbol
function getAspectSymbol(aspectName: string): string {
  const name = aspectName.toLowerCase()

  if (ASPECT_SYMBOLS[name]) return ASPECT_SYMBOLS[name]
  return aspectName.charAt(0).toUpperCase()
}

// Helper to format position (e.g., 15° Leo)
function formatPosition(point: Point | undefined): string {
  if (!point) return ''
  return `${Math.floor(point.position)}° ${point.sign}`
}

interface AspectRow {
  id: string
  p1_name: string
  p1_emoji: string // Natal planet usually
  p2_name: string
  p2_emoji: string // Transit planet usually
  aspect_name: string
  // Map of date string to aspect data
  days: Record<string, Aspect>
}

export function TimelineEventTable({
  transitData,
  subjectId,
  selectedTransitPlanets,
  selectedNatalPlanets,
  selectedAspects,
  natalSubject,
  filters,
}: TimelineEventTableProps) {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // 1. Pivot data: Group by unique aspect (TransitPlanet + AspectType + NatalPlanet)
  // Also create a map from dates to transit subjects for tooltip access
  const { rows, dates, dateToTransitSubject } = useMemo(() => {
    const rowMap = new Map<string, AspectRow>()
    const dateSet = new Set<string>()
    const dateToSubjectMap = new Map<string, EnrichedSubjectModel>()

    transitData.forEach((day) => {
      const dateStr = day.date.split('T')[0] // YYYY-MM-DD
      if (dateStr) {
        dateSet.add(dateStr)
        dateToSubjectMap.set(dateStr, day.transitSubject)
      }

      day.aspects.forEach((aspect) => {
        // Filter by selected Transit Planets (P2)
        // Case-insensitive check
        if (!selectedTransitPlanets.some((p) => p.toLowerCase() === aspect.p2_name.toLowerCase())) return

        // Filter by selected Natal Planets (P1)
        if (!selectedNatalPlanets.some((p) => p.toLowerCase() === aspect.p1_name.toLowerCase())) return

        // Filter by selected Aspects
        if (!selectedAspects.some((a) => a.toLowerCase() === aspect.aspect.toLowerCase())) return

        const key = `${aspect.p1_name}-${aspect.aspect}-${aspect.p2_name}`

        if (!rowMap.has(key)) {
          let p1Emoji = ''
          let p2Emoji = ''

          // Try to find p1 (Natal) in natalSubject
          const p1Obj = Object.values(natalSubject).find((p: unknown) => {
            if (typeof p === 'object' && p !== null && 'name' in p) {
              return (p as { name: string }).name === aspect.p1_name
            }
            return false
          }) as { emoji: string } | undefined

          if (p1Obj) p1Emoji = p1Obj.emoji

          // Try to find p2 (Transit) in transitSubject
          const p2Obj = Object.values(day.transitSubject).find((p: unknown) => {
            if (typeof p === 'object' && p !== null && 'name' in p) {
              return (p as { name: string }).name === aspect.p2_name
            }
            return false
          }) as { emoji: string } | undefined

          if (p2Obj) p2Emoji = p2Obj.emoji

          rowMap.set(key, {
            id: key,
            p1_name: aspect.p1_name,
            p1_emoji: p1Emoji || '•',
            p2_name: aspect.p2_name,
            p2_emoji: p2Emoji || '•',
            aspect_name: aspect.aspect,
            days: {},
          })
        }

        const row = rowMap.get(key)
        if (row && dateStr) {
          row.days[dateStr] = aspect
        }
      })
    })

    // Sort dates
    const sortedDates = Array.from(dateSet).sort()

    // Sort rows? Maybe by Transit Planet speed/order?
    // For now, alphabetical or insertion order.
    const sortedRows = Array.from(rowMap.values())

    return { rows: sortedRows, dates: sortedDates, dateToTransitSubject: dateToSubjectMap }
  }, [transitData, selectedTransitPlanets, selectedNatalPlanets, selectedAspects, natalSubject])

  // Check for large range (approx > 1 month)
  const isLargeRange = dates.length > 32

  // Enforce limit if range is large
  useEffect(() => {
    if (isLargeRange) {
      setRowsPerPage(10)
    }
  }, [isLargeRange])

  // Pagination calculations
  const totalRows = rows.length
  // Ensure rowsPerPage is 10 if large range (in case state hasn't updated yet or logic race)
  const effectiveRowsPerPage = isLargeRange ? 10 : rowsPerPage
  const totalPages = Math.ceil(totalRows / effectiveRowsPerPage)
  const startIndex = (currentPage - 1) * effectiveRowsPerPage
  const endIndex = startIndex + effectiveRowsPerPage
  const paginatedRows = rows.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [totalRows])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-4">
        {/* Controls Row - filters + pagination on same row on desktop */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          {/* Filters - left side */}
          {filters && <div className="w-full sm:flex-1 sm:w-auto">{filters}</div>}

          {/* Rows + Pagination - full width on mobile with justify-between */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            {/* Rows per page */}
            <Select
              value={String(effectiveRowsPerPage)}
              onValueChange={(value) => !isLargeRange && setRowsPerPage(Number(value))}
              disabled={isLargeRange}
            >
              <SelectTrigger size="sm" className="w-auto text-xs gap-1">
                <span className="text-muted-foreground">Rows:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                {!isLargeRange && <SelectItem value="20">20</SelectItem>}
                {!isLargeRange && <SelectItem value="50">50</SelectItem>}
              </SelectContent>
            </Select>

            {/* Pagination - compact button group */}
            <div className="flex items-center rounded-md border overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-r"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="h-8 px-3 flex items-center justify-center text-xs text-muted-foreground bg-muted/30 min-w-[80px]">
                <span className="font-medium text-foreground">{currentPage}</span>
                <span className="mx-1">/</span>
                <span>{totalPages || 1}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none border-l"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-hidden">
          <div className="w-full overflow-x-auto">
            <div className="flex w-max min-w-full flex-col">
              {/* Header Rows */}
              <div className="sticky top-0 z-30 flex flex-col bg-background">
                {/* Month Row */}
                <div className="flex border-b bg-muted/80">
                  <div className="sticky left-0 z-20 flex w-[70px] sm:w-[180px] flex-none items-center border-r bg-background p-2 font-semibold text-xs text-muted-foreground">
                    Month
                  </div>
                  <div className="flex flex-1">
                    {(() => {
                      const months: { key: string; label: string; count: number }[] = []
                      dates.forEach((date) => {
                        const d = new Date(date)
                        const key = format(d, 'yyyy-MM')
                        const label = format(d, 'MMMM yyyy')
                        const last = months[months.length - 1]
                        if (last && last.key === key) {
                          last.count++
                        } else {
                          months.push({ key, label, count: 1 })
                        }
                      })
                      return months.map((month) => (
                        <div
                          key={month.key}
                          className="flex flex-none items-center justify-center border-r px-2 py-1 text-xs font-semibold truncate"
                          style={{ width: `${month.count * 2.5}rem` }} // w-10 is 2.5rem
                        >
                          {month.label}
                        </div>
                      ))
                    })()}
                  </div>
                </div>

                {/* Day Row */}
                <div className="flex border-b bg-muted/50">
                  {/* Fixed Column for Aspect Names */}
                  <div className="sticky left-0 z-20 flex w-[70px] sm:w-[180px] flex-none items-center border-r bg-background p-2 font-semibold text-[12px] sm:text-sm">
                    Aspect
                  </div>
                  {/* Date Columns */}
                  <div className="flex flex-1">
                    {dates.map((date) => {
                      const d = new Date(date)
                      return (
                        <Link
                          key={date}
                          href={`/subjects/${subjectId}/transits?date=${date}`}
                          className="flex h-10 w-10 flex-none flex-col items-center justify-center border-r p-1 text-[10px] hover:bg-muted/80 transition-colors"
                          title={`View Transit Chart for ${date}`}
                        >
                          <span className="font-bold">{format(d, 'dd')}</span>
                          <span className="text-muted-foreground">{format(d, 'EE')}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Data Rows - Use paginatedRows instead of rows */}
              {paginatedRows.map((row) => (
                <div key={row.id} className="flex border-b hover:bg-muted/30 transition-colors">
                  {/* Fixed Column: Aspect Name */}
                  <div className="sticky left-0 z-10 flex w-[70px] sm:w-[180px] flex-none items-center gap-2 border-r bg-background p-2 text-sm justify-center sm:justify-start">
                    <span
                      className={cn(
                        'w-4 h-4 flex-none flex items-center justify-center leading-none',
                        getAspectTextColor(row.aspect_name),
                        getAspectTextSize(row.aspect_name),
                      )}
                    >
                      {getAspectSymbol(row.aspect_name)}
                    </span>
                    <div className="flex flex-col min-w-0 items-center sm:items-start">
                      <span className="font-medium text-xs truncate">
                        <span className="hidden sm:inline mr-1">{row.p2_emoji}</span>
                        <span className="sm:hidden">{formatPlanetNameShort(row.p2_name)}</span>
                        <span className="hidden sm:inline">{formatPlanetName(row.p2_name)}</span>
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        <span className="hidden sm:inline mr-1">{row.p1_emoji}</span>
                        <span className="sm:hidden">{formatPlanetNameShort(row.p1_name)}</span>
                        <span className="hidden sm:inline">{formatPlanetName(row.p1_name)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Days Cells */}
                  <div className="flex flex-1">
                    {dates.map((date) => {
                      const aspect = row.days[date]
                      if (!aspect) {
                        return <div key={date} className="h-10 w-10 flex-none border-r" />
                      }

                      // Calculate opacity based on orb (tighter = more opaque)
                      const maxOrb = 8
                      const opacity = Math.max(0.2, 1 - aspect.orbit / maxOrb)

                      // Calculate positions for the tooltip
                      const transitSubject = dateToTransitSubject.get(date)
                      const p2Position = transitSubject
                        ? formatPosition(
                            transitSubject[
                              aspect.p2_name.toLowerCase().replace(' ', '_') as keyof EnrichedSubjectModel
                            ] as Point,
                          )
                        : 'N/A'
                      const p1Position = formatPosition(
                        natalSubject[
                          aspect.p1_name.toLowerCase().replace(' ', '_') as keyof EnrichedSubjectModel
                        ] as Point,
                      )

                      const Content = (
                        <AspectTooltipContent
                          aspect={aspect}
                          date={format(new Date(date), 'PPP')}
                          p1Position={p1Position}
                          p2Position={p2Position}
                          p1Label="Natal"
                          p2Label="Transit"
                        />
                      )

                      if (isDesktop) {
                        return (
                          <Tooltip key={date}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  'h-10 w-10 flex-none border-r cursor-pointer transition-opacity hover:opacity-100',
                                  getAspectColor(aspect.aspect),
                                )}
                                style={{ opacity }}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {Content}
                            </TooltipContent>
                          </Tooltip>
                        )
                      }

                      return (
                        <Popover key={date}>
                          <PopoverTrigger asChild>
                            <div
                              className={cn(
                                'h-10 w-10 flex-none border-r cursor-pointer transition-opacity hover:opacity-100',
                                getAspectColor(aspect.aspect),
                              )}
                              style={{ opacity }}
                            />
                          </PopoverTrigger>
                          <PopoverContent side="top" className="max-w-xs">
                            {Content}
                          </PopoverContent>
                        </Popover>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
