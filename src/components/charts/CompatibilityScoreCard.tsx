'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { Heart, Sparkles, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface ScoreBreakdownItem {
  rule: string
  description: string
  points: number
  details: string
}

interface RelationshipScore {
  score_value: number
  score_description?: string
  is_destiny_sign: boolean
  notes?: string
  score_breakdown?: ScoreBreakdownItem[]
}

interface CompatibilityScoreCardProps {
  relationshipScore: RelationshipScore
  className?: string
}

/**
 * Displays the Ciro Discepolo compatibility score for synastry charts.
 * Shows the numeric score, description, destiny sign indicator, and breakdown from API.
 */
export function CompatibilityScoreCard({ relationshipScore, className }: CompatibilityScoreCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const { score_value, score_description, is_destiny_sign, score_breakdown } = relationshipScore

  // Score color based on value (higher = more compatible)
  const getScoreColor = (score: number) => {
    if (score >= 15) return 'text-foreground'
    if (score >= 10) return 'text-foreground'
    if (score >= 5) return 'text-muted-foreground'
    return 'text-muted-foreground'
  }

  // Score border color - green tones based on score
  const getScoreBorder = (score: number) => {
    if (score >= 15) return 'border-emerald-500/60'
    if (score >= 10) return 'border-green-500/50'
    if (score >= 5) return 'border-green-500/30'
    return 'border-muted-foreground/30'
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
        <Heart className="h-4 w-4" /> Compatibility Score
      </div>
      <Card className="shadow-sm overflow-hidden pb-2">
        <CardContent className="p-0 pt-0">
          <div className="flex items-center justify-center gap-6 p-0 pb-6 px-6 bg-card">
            {/* Score Circle */}
            <div className="relative flex items-center justify-center">
              <div
                className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center',
                  'bg-linear-to-br from-background to-muted',
                  'border-2 shadow-sm',
                  getScoreBorder(score_value),
                )}
              >
                <span className={cn('text-3xl font-bold tabular-nums', getScoreColor(score_value))}>{score_value}</span>
              </div>
            </div>

            {/* Description & Details */}
            <div className="flex flex-col gap-2">
              {score_description && <span className="text-lg font-semibold">{score_description}</span>}

              <div className="flex flex-wrap gap-2">
                {is_destiny_sign && (
                  <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Destiny Sign
                  </Badge>
                )}
                {score_breakdown && score_breakdown.length > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {score_breakdown.length} factor{score_breakdown.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground max-w-xs">Based on Ciro Discepolo&apos;s method</p>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="border-t bg-card">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-full flex items-center justify-between px-4 py-1 pt-2 cursor-pointer text-sm text-muted-foreground"
            >
              <span>How is the score calculated?</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', showBreakdown && 'rotate-180')} />
            </button>

            {showBreakdown && (
              <div className="px-4 pb-4 space-y-4 mt-1">
                {/* Method Explanation */}
                <div className="text-xs text-muted-foreground space-y-2">
                  <p className="font-medium">Scoring rules:</p>
                  <p className="text-muted-foreground leading-relaxed text-justify">
                    This compatibility analysis evaluates fundamental planetary interactions, prioritizing Sun, Moon,
                    and Ascendant aspects as emotional foundations. Significant weight is given to Sun-Moon conjunctions
                    and &quot;Signs of Destiny&quot; (shared Sun sign modality) to identify profound connections, while
                    Venus-Mars aspects assess attraction and energetic alignment.
                  </p>
                </div>

                {/* Score Calculation Breakdown from API */}
                {score_breakdown && score_breakdown.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Breakdown</p>

                    <div className="space-y-1">
                      {score_breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-sm py-1.5 px-3 rounded-md bg-muted/30"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.description}</span>
                            {item.details && <span className="text-xs text-muted-foreground">{item.details}</span>}
                          </div>
                          <span className="font-bold tabular-nums min-w-[50px] text-right text-emerald-600">
                            +{item.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
