import { Card, CardContent } from '@/components/ui/card'
import { Zap } from 'lucide-react'
import { Aspect } from '@/types/astrology'
import { scoreAspect, MAJOR_ASPECTS } from '@/lib/astrology/chart-highlights'

interface KeyAspectsSectionProps {
  aspects: Aspect[]
  maxAspects?: number
  className?: string
  chartType?: string
}

/**
 * Key Aspects Section
 *
 * Displays the top N most significant aspects based on classical astrology scoring.
 * Priority order:
 * 1. Major transits (Saturn, Jupiter to personal planets)
 * 2. Personal planet conjunctions/oppositions
 * 3. Sun/Moon aspects
 * 4. Venus/Mars aspects
 * 5. Ascendant/MC aspects
 * 6. Other traditional aspects
 */
export function KeyAspectsSection({ aspects, maxAspects = 6, className, chartType }: KeyAspectsSectionProps) {
  if (!aspects || aspects.length === 0) return null

  // Helper to check if an aspect is inherent to the chart type (should be excluded)
  const isInherentAspect = (aspect: Aspect): boolean => {
    const normalizedType = chartType?.toLowerCase().replace(/_/g, ' ')
    const isSunSun = aspect.p1_name === 'Sun' && aspect.p2_name === 'Sun'
    const isMoonMoon = aspect.p1_name === 'Moon' && aspect.p2_name === 'Moon'

    // Exclude Sun-Sun conjunction in Solar Return (it's the definition of the return)
    if (normalizedType?.includes('solar return') && isSunSun) {
      return true
    }

    // Exclude Moon-Moon conjunction in Lunar Return (it's the definition of the return)
    if (normalizedType?.includes('lunar return') && isMoonMoon) {
      return true
    }

    return false
  }

  // Score and sort all aspects
  const scoredAspects = aspects
    .filter((a) => MAJOR_ASPECTS.includes(a.aspect.toLowerCase()))
    .filter((a) => !isInherentAspect(a))
    .map((a) => ({ aspect: a, score: scoreAspect(a) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAspects)

  if (scoredAspects.length === 0) return null

  // Aspect symbol mapping
  const getAspectSymbol = (aspectName: string): string => {
    const name = aspectName.toLowerCase()
    switch (name) {
      case 'conjunction':
        return '☌'
      case 'opposition':
        return '☍'
      case 'trine':
        return '△'
      case 'square':
        return '□'
      case 'sextile':
        return '⚹'
      default:
        return aspectName
    }
  }

  // Aspect color mapping
  const getAspectColor = (aspectName: string): string => {
    const name = aspectName.toLowerCase()
    switch (name) {
      case 'conjunction':
        return 'text-amber-500'
      case 'opposition':
        return 'text-red-500'
      case 'trine':
        return 'text-green-500'
      case 'square':
        return 'text-orange-500'
      case 'sextile':
        return 'text-blue-500'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <div className={`relative ${className || 'mb-6'}`}>
      <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
        <Zap className="h-4 w-4" /> Key Aspects
      </div>
      <Card className="shadow-sm h-full">
        <CardContent className="p-4 pt-6 h-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-2">
            {scoredAspects.map(({ aspect }, idx) => {
              const normalizedType = chartType?.toLowerCase() || ''

              // Check if this is a dual chart type that needs owner indicators
              const isDualChart =
                normalizedType.includes('synastry') ||
                normalizedType.includes('transit') ||
                normalizedType.includes('return')

              // Check if owners are explicitly different (for synastry)
              const hasDifferentOwners = aspect.p1_owner && aspect.p2_owner && aspect.p1_owner !== aspect.p2_owner

              // Show owner labels if it's a dual chart OR has different owners
              const showOwnerLabels = isDualChart || hasDifferentOwners

              // Get label for owner based on chart type
              const getOwnerLabel = (isSecondSubject: boolean) => {
                // For transit charts, label the transit subject
                if (normalizedType.includes('transit')) {
                  return isSecondSubject ? 'Transit' : 'Natal'
                }

                // For return charts, label the return subject
                if (normalizedType.includes('return')) {
                  return isSecondSubject ? 'Return' : 'Natal'
                }

                // For synastry and other dual charts, show first name
                if (aspect.p1_owner || aspect.p2_owner) {
                  const owner = isSecondSubject ? aspect.p2_owner : aspect.p1_owner
                  if (owner) {
                    const firstName = owner.split(' ')[0] || owner
                    return firstName.length > 8 ? firstName.substring(0, 3) : firstName
                  }
                }
                return ''
              }

              // In transit/return charts: first point is typically natal, second is transit/return
              // This is based on convention - p1 is usually from first chart, p2 from second
              const p1IsSecond = false // First planet is from natal (first) chart
              const p2IsSecond = true // Second planet is from transit/return (second) chart

              // For transit charts, swap display order: show Transit first, then Natal
              const isTransitChart = normalizedType.includes('transit')
              const firstPlanet = isTransitChart ? aspect.p2_name : aspect.p1_name
              const secondPlanet = isTransitChart ? aspect.p1_name : aspect.p2_name
              const firstLabel = isTransitChart ? getOwnerLabel(p2IsSecond) : getOwnerLabel(p1IsSecond)
              const secondLabel = isTransitChart ? getOwnerLabel(p1IsSecond) : getOwnerLabel(p2IsSecond)

              return (
                <div key={idx} className="flex flex-col items-center justify-center text-center p-2 gap-1 h-full">
                  <div className="flex items-center gap-2 text-base">
                    <span className="font-medium">
                      {firstPlanet.replace(/_/g, ' ')}
                      {showOwnerLabels && ` ${firstLabel}`}
                    </span>
                    <span className={`font-bold text-xl leading-none ${getAspectColor(aspect.aspect)}`}>
                      {getAspectSymbol(aspect.aspect)}
                    </span>
                    <span className="font-medium">
                      {secondPlanet.replace(/_/g, ' ')}
                      {showOwnerLabels && ` ${secondLabel}`}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {aspect.orbit.toFixed(1)}° orb
                    {aspect.aspect_movement && chartType?.toLowerCase() !== 'synastry' && (
                      <span className="ml-1">
                        - {aspect.aspect_movement === 'applying' ? 'Applying' : 'Separating'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
