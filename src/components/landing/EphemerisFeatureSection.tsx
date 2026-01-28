'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function EphemerisFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Screenshot */}
          <div
            className={`order-2 lg:order-1 relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}
          >
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/ephemeris-chart.webp"
              alt="Graphical Ephemeris - Visual planetary position chart"
            />
          </div>

          {/* Content */}
          <div className={`order-1 lg:order-2 ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}>
            <Badge variant="secondary" className="mb-4">
              Ephemeris & Tables
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Visual
              <span className="gradient-text-subtle"> Planetary Ephemeris</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Explore planetary positions with both graphical and tabular views. Track planetary movements across the
              zodiac over any time period.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Graphical ephemeris chart with planetary tracks',
                'Detailed position tables by date',
                'Retrograde periods clearly highlighted',
                'Export data for research and reference',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function EphemerisListFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content - left side */}
          <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
            <Badge variant="secondary" className="mb-4">
              Position Tables
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Detailed
              <span className="gradient-text-subtle"> Position Data</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Access precise planetary positions for any date range. Perfect for research, mundane astrology, and
              verifying chart calculations.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Daily positions for all planets',
                'Degree, minutes, and seconds precision',
                'Moon phases and void-of-course times',
                'Ingress dates and sign changes',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot - right side */}
          <div className={`relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}>
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/ephemeris-list.webp"
              alt="Ephemeris Table - Daily planetary positions in tabular format"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
