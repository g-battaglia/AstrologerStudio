import { Card, CardContent } from '@/components/ui/card'
import type { LunarPhase } from '@/types/astrology'
import { cn } from '@/lib/utils/cn'

interface LunarPhaseCardProps {
  lunarPhase: LunarPhase
  className?: string
  month?: number // 1-12
}

/**
 * Draws a realistic moon phase SVG.
 * @param phase 0.0 to 1.0 (0=New, 0.5=Full, 1.0=New)
 */
const MoonPhaseVisual = ({ phase }: { phase: number }) => {
  // Ensure phase is 0-1
  const normalizedPhase = phase % 1

  // Calculate illumination (0 to 1) from phase
  // New Moon (0) -> 0
  // First Quarter (0.25) -> 0.5
  // Full Moon (0.5) -> 1
  // Last Quarter (0.75) -> 0.5
  const illumination = 0.5 * (1 - Math.cos(normalizedPhase * 2 * Math.PI))

  // Determine if waxing or waning
  const isWaxing = normalizedPhase <= 0.5

  // Radius of the moon
  const r = 49.5
  const cx = 50
  const cy = 50

  // SVG Path logic for the terminator line
  // The terminator describes a semi-ellipse with width varying from -r to r
  // Width w = r * cos(phase * 2 * PI)
  // But we need to handle waxing/waning logic for the arc directions

  // Simplification using a mask or arc strategy:
  // Base circle (Shadow)
  // Lit circle (Light)
  // Mask the lit circle with the shadow shape?

  // Let's use a path definition approach.
  // Start at Top (50, 0), End at Bottom (50, 100)
  // Left arc is constant for half the cycle, Right arc is constant for the other half?
  // Actually, a robust way is:
  // 1. Draw full circle dark.
  // 2. Draw lit portion.

  // Standard Northern Hemisphere view:
  // Waxing: Lit on Right. Waning: Lit on Left.

  // Calculate the horizontal radius of the terminator ellipse
  // x_radius goes from r to -r
  const xRadius = r * Math.cos(normalizedPhase * 2 * Math.PI)

  // Path for the lit part
  let d = ''

  if (isWaxing) {
    // Waxing (0 to 0.5)
    // Right side of outer circle is always lit
    // Terminator curve moves from right (-r) to left (+r) ?
    // Check math: cos(0) = 1 -> ellipse is circle edge matching right edge? No.
    // Let's use a proven path construction.

    // M cx, 0 (Top)
    // A r,r 0 0,1 cx, 100 (Right semi-circle)
    // A xRadius, r 0 0,sweep cx, 0 (Terminator back to top)
    const sweep = normalizedPhase < 0.25 ? 0 : 1
    d = `M ${cx},${cy - r} A ${r},${r} 0 0,1 ${cx},${cy + r} A ${Math.abs(xRadius)},${r} 0 0,${sweep} ${cx},${cy - r}`
  } else {
    // Waning (0.5 to 1.0)
    // Left side of outer circle is always lit
    // M cx, cy-r (Top)
    // A r,r 0 0,0 cx, cy+r (Left semi-circle to Bottom)
    // A xRadius, r 0 0,sweep cx, cy-r (Terminator back to Top)

    // Waning Gibbous (< 0.75): Big hump. Terminator must bulge Right. -> Sweep 0.
    // Waning Crescent (> 0.75): Small sliver. Terminator must bulge Left. -> Sweep 1.
    const sweep = normalizedPhase < 0.75 ? 0 : 1
    d = `M ${cx},${cy - r} A ${r},${r} 0 0,0 ${cx},${cy + r} A ${Math.abs(xRadius)},${r} 0 0,${sweep} ${cx},${cy - r}`
  }

  return (
    <svg
      viewBox="-10 -10 120 120"
      className="w-full h-full drop-shadow-xl"
      role="img"
      aria-label={`Moon Phase: ${Math.round(illumination * 100)}% illuminated`}
    >
      <defs>
        <radialGradient id="moonGradient" cx="50%" cy="50%" r="50%" fx="25%" fy="25%">
          <stop offset="0%" stopColor="#ffffdd" />
          <stop offset="100%" stopColor="#d1d1c4" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.0" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background (Dark Moon / Shadow) */}
      <circle cx="50" cy="50" r="50" fill="#1a1a2e" stroke="none" />

      {/* Lit Portion */}
      <path d={d} fill="url(#moonGradient)" filter="url(#glow)" />

      {/* Optional: Crater detail overlay (faint) could be added here for extra premium feel, but keep it clean for now */}
    </svg>
  )
}

const getTraditionalMoonName = (month: number) => {
  const names = [
    'Wolf Moon', // Jan
    'Snow Moon', // Feb
    'Worm Moon', // Mar
    'Pink Moon', // Apr
    'Flower Moon', // May
    'Strawberry Moon', // Jun
    'Buck Moon', // Jul
    'Sturgeon Moon', // Aug
    'Harvest Moon', // Sep (Technically varies, but Corn is common too. Using Harvest/Corn)
    "Hunter's Moon", // Oct
    'Beaver Moon', // Nov
    'Cold Moon', // Dec
  ]
  return names[month - 1] || ''
}

export function LunarPhaseCard({ lunarPhase, className, month }: LunarPhaseCardProps) {
  // Use degrees_between_s_m as the source of truth to avoid ambiguity with moon_phase units.
  // 0° = New Moon, 180° = Full Moon, 360° = New Moon again.
  const degrees = lunarPhase.degrees_between_s_m
  const normalizedPhase = degrees / 360

  // Calculate Illumination
  // cos(0) = 1 -> 0%
  // cos(180) = -1 -> 100%
  const illumination = 50 * (1 - Math.cos(degrees * (Math.PI / 180)))

  // Calculate Moon Age in Days (Synodic Month = ~29.53 days)
  const moonAge = normalizedPhase * 29.53

  // Determine if it's a Full Moon (illumination > 97%) to show traditional name
  const isFullMoon = illumination > 97
  const traditionalName = isFullMoon && month ? getTraditionalMoonName(month) : null

  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex flex-col items-center text-center gap-2 pb-4 pt-0">
        {/* Visual Section */}
        <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0">
          <MoonPhaseVisual phase={normalizedPhase} />
        </div>

        {/* Details Section */}
        <div className="flex flex-col gap-1 w-full items-center">
          <div>
            <h3 className="text-lg font-bold text-primary">{lunarPhase.moon_phase_name}</h3>
            {traditionalName && <p className="text-sm font-semibold text-amber-500/90">{traditionalName}</p>}
            <p className="text-xs text-muted-foreground">{illumination.toFixed(0)}% Illuminated</p>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mt-1 w-full max-w-[200px]">
            <div className="flex flex-col">
              <span className="text-muted-foreground uppercase tracking-wider scale-90 origin-center">Sun-Moon</span>
              <span className="font-medium tabular-nums">{lunarPhase.degrees_between_s_m.toFixed(0)}°</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground uppercase tracking-wider scale-90 origin-center">Progress</span>
              <span className="font-medium tabular-nums">{(normalizedPhase * 100).toFixed(0)}%</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="text-muted-foreground text-xs uppercase tracking-wider">Moon Age</span>
              <span className="font-medium tabular-nums">Day {moonAge.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
