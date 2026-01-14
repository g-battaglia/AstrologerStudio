/**
 * ChartHighlights Component
 *
 * Displays a compact summary of key astrological data at the top of the Data tab.
 * The content shown depends on the chart type (Natal, Transit, Synastry, etc.).
 *
 * Architecture:
 * - `chartHighlightsUtils.ts`: Core logic (formatting, aspect finding, types)
 * - `chartHighlightsContent.tsx`: Content generators for each chart type
 * - This file: Orchestration and rendering only
 */

'use client'

import { useState, useEffect } from 'react'
import { ChartData, HouseComparison } from '@/types/astrology'
import { Card, CardContent } from '@/components/ui/card'
import { Star } from 'lucide-react'
import { getChartPreferences } from '@/actions/preferences'

import {
  HighlightItem,
  normalizeChartType,
  getRelevantAspects,
  getEffectiveSubject,
} from '@/lib/astrology/chart-highlights'

import {
  getNatalHighlights,
  getTransitHighlights,
  getSynastryHighlights,
  getCompositeHighlights,
  getReturnHighlights,
} from './chartHighlightsContent'

// ============================================================================
// PROPS
// ============================================================================

interface ChartHighlightsProps {
  data: ChartData
  secondaryData?: ChartData
  chartType: string
  /** Optional override for house comparison data (e.g. for transits where data comes from combined chart) */
  houseComparison?: HouseComparison
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChartHighlights({ data, secondaryData, chartType, houseComparison }: ChartHighlightsProps) {
  const [rulershipMode, setRulershipMode] = useState<'classical' | 'modern'>('classical')

  // Fetch preferences to get the user's preferred rulership mode
  useEffect(() => {
    async function loadPreferences() {
      try {
        const prefs = await getChartPreferences()
        if (prefs?.rulership_mode) {
          setRulershipMode(prefs.rulership_mode as 'classical' | 'modern')
        }
      } catch (error) {
        console.error('Failed to load chart preferences in highlights:', error)
      }
    }
    loadPreferences()
  }, [])

  // Normalize chart type and get relevant data
  const normalizedType = normalizeChartType(chartType)
  const effectiveSubject = getEffectiveSubject(normalizedType, data, secondaryData)
  const aspects = getRelevantAspects(normalizedType, data, secondaryData)

  // Generate content based on chart type
  let items: HighlightItem[] = []

  switch (normalizedType) {
    case 'natal':
      items = getNatalHighlights(effectiveSubject)
      break
    case 'transit':
      items = getTransitHighlights(effectiveSubject, aspects, houseComparison || data.house_comparison)
      break
    case 'synastry':
      items = getSynastryHighlights(aspects)
      break
    case 'composite':
      items = getCompositeHighlights(effectiveSubject, aspects)
      break
    case 'solar return': {
      // For dual return charts: data=Natal (Main Chart Data), secondary=Return
      // We must account for data.first_subject being the populated one if data.subject is partial
      const natalSubject = data.first_subject || data.subject

      items = getReturnHighlights(
        secondaryData ? secondaryData.subject : data.subject,
        secondaryData ? natalSubject : undefined,
        aspects,
        true,
        rulershipMode,
        houseComparison || data.house_comparison,
      )
      break
    }
    case 'lunar return': {
      // For dual return charts
      const natalSubjectLunar = data.first_subject || data.subject

      items = getReturnHighlights(
        secondaryData ? secondaryData.subject : data.subject,
        secondaryData ? natalSubjectLunar : undefined,
        aspects,
        false,
        rulershipMode,
        houseComparison || data.house_comparison,
      )
      break
    }
    default:
      // Unknown chart type, don't render anything
      return null
  }

  if (items.length === 0) return null

  return (
    <div className="relative mb-6">
      <div className="absolute -top-3 left-4 px-2 bg-background text-sm text-muted-foreground z-10 flex items-center gap-2">
        <Star className="h-4 w-4" /> Chart Highlights
      </div>
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0 pt-4">
          <div className="flex flex-col md:flex-row md:justify-center md:flex-wrap gap-4">
            {items.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-4 gap-2 md:min-w-[200px]">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold block">{item.value}</span>
                  {item.detail && <span className="text-xs text-muted-foreground block mt-1">{item.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
