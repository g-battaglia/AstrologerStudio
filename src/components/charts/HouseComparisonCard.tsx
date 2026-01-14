'use client'

import { HouseComparison, PointInHouseModel } from '@/types/astrology'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Home } from 'lucide-react'

interface HouseComparisonCardProps {
  houseComparison: HouseComparison
}

// Helper to format house number with ordinal suffix
const formatHouseNumber = (num: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const v = num % 100
  const suffix = suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]
  return `${num}${suffix}`
}

// Helper to get display name for a point
const formatPointName = (name: string): string => {
  return name.replace(/_/g, ' ').replace(/Mean |True /g, '')
}

// Component for displaying a single point in house
function PointInHouseRow({ point }: { point: PointInHouseModel }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-medium">{formatPointName(point.point_name)}</span>
        <span className="text-xs text-muted-foreground">
          {point.point_degree.toFixed(1)}° {point.point_sign}
        </span>
      </div>
      <Badge variant="secondary" className="text-xs">
        {formatHouseNumber(point.projected_house_number)} House
      </Badge>
    </div>
  )
}

export function HouseComparisonCard({ houseComparison }: HouseComparisonCardProps) {
  const { first_subject_name, second_subject_name } = houseComparison

  // House cusps come from dedicated cusp arrays when available
  const firstCuspPoints = houseComparison.first_cusps_in_second_houses ?? []
  const secondCuspPoints = houseComparison.second_cusps_in_first_houses ?? []

  // Sort house cusps by projected house number
  const sortByHouseNumber = (a: PointInHouseModel, b: PointInHouseModel) =>
    (a.projected_house_number ?? 0) - (b.projected_house_number ?? 0)

  const sortedFirstCuspPoints = [...firstCuspPoints].sort(sortByHouseNumber)
  const sortedSecondCuspPoints = [...secondCuspPoints].sort(sortByHouseNumber)

  return (
    <div className="relative w-full">
      <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
        <Home className="h-4 w-4" /> House Cusps Overlay
      </div>
      <Card className="w-full shadow-sm">
        <CardContent className="space-y-4 p-4 pt-0">
          <Tabs defaultValue="first" className="w-full space-y-4">
            <TabsList className="grid w-full sm:max-w-md grid-cols-2">
              <TabsTrigger
                value="first"
                className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
              >
                {first_subject_name}
              </TabsTrigger>
              <TabsTrigger
                value="second"
                className="data-[state=active]:bg-card data-[state=active]:shadow-md dark:data-[state=active]:border dark:data-[state=active]:bg-background"
              >
                {second_subject_name}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="first" className="space-y-4 mt-2">
              {/* First subject's house cusps in second subject's houses */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                  {first_subject_name}&apos;s house cusps in {second_subject_name}&apos;s houses
                </h4>
                <div className="rounded-lg border bg-card">
                  {sortedFirstCuspPoints.length > 0 ? (
                    <div className="p-3">
                      {sortedFirstCuspPoints.map((point, idx) => (
                        <PointInHouseRow key={`first-cusp-${idx}`} point={point} />
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground italic">No data available</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="second" className="space-y-4 mt-2">
              {/* Second subject's house cusps in first subject's houses */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                  {second_subject_name}&apos;s house cusps in {first_subject_name}&apos;s houses
                </h4>
                <div className="rounded-lg border bg-card">
                  {sortedSecondCuspPoints.length > 0 ? (
                    <div className="p-3">
                      {sortedSecondCuspPoints.map((point, idx) => (
                        <PointInHouseRow key={`second-cusp-${idx}`} point={point} />
                      ))}
                    </div>
                  ) : (
                    <p className="p-3 text-sm text-muted-foreground italic">No data available</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
