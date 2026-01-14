'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function ChartsFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-20" id="features">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
            <Badge variant="secondary" className="mb-4">
              Interactive Charts
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Beautiful, Precise
              <span className="gradient-text-subtle"> Astrology Charts</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              High-precision SVG charts with interactive hover states, customizable themes, and detailed planetary
              positions. Every chart is calculated with astronomical accuracy.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Natal, Transits, Synastry, Composite charts',
                'Solar and Lunar Return charts',
                'Multiple house systems (Placidus, Whole Sign, Koch...)',
                'Tropical and Sidereal zodiac options',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot */}
          <div className={`relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}>
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/birth-chart.webp"
              alt="Natal Chart - Interactive astrology chart with planetary positions"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
