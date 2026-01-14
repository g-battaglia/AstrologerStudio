'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function TransitFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content - right side */}
          <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
            <Badge variant="secondary" className="mb-4">
              Transit Analysis
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Real-Time
              <span className="gradient-text-subtle"> Planetary Transits</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Overlay current planetary positions on any natal chart. Track how transiting planets interact with natal
              placements to understand timing and influences.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Dual-ring chart with natal and transit positions',
                'Aspect lines between transit and natal planets',
                'Customizable transit date selection',
                'Instant aspect calculations',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot - left side */}
          <div className={`relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}>
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/transit-chart.webp"
              alt="Transit Chart - Current planetary transits overlaid on natal chart"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
