import type { TooltipProps } from 'recharts'
import type { PlanetKey, PlanetColors } from '@/types/ephemeris-view'
import { formatPlanetName } from '@/lib/astrology/planet-formatting'

type Props = {
  enabled: Record<PlanetKey, boolean>
  colors: PlanetColors
}

export function ChartTooltip({ enabled, colors }: Props) {
  return function TooltipContent({ active, label, payload }: TooltipProps<number, string>) {
    if (!active || !payload || payload.length === 0) return null
    const items = payload.filter((p) => enabled[p.name as PlanetKey])
    if (items.length === 0) return null
    return (
      <div className="rounded border bg-background/80 backdrop-blur-sm text-popover-foreground shadow-xs p-2 text-xs">
        <div className="mb-1 font-medium">
          {typeof label === 'string' && label.includes('T')
            ? new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })
            : String(label)}
        </div>
        <div className="flex flex-col gap-1">
          {items.map((item) => {
            const key = item.name as PlanetKey
            const color = colors[key]?.stroke
            const raw = item.value as number | string | undefined
            const fallback = typeof raw === 'number' ? `${raw.toFixed(2)}°` : String(raw ?? '')
            const labelKey = `${key}Label` as `${PlanetKey}Label`
            const tooltipVal = (item.payload?.[labelKey] as string | undefined) ?? ''
            const display = tooltipVal || fallback
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="opacity-70">{formatPlanetName(key)}</span>
                <span className="ml-auto tabular-nums">{display}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
