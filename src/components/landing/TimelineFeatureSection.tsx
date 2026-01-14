'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function TimelineFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className={isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}>
            <Badge variant="secondary" className="mb-4">
              Transit Timeline
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Track
              <span className="gradient-text-subtle"> Upcoming Transits</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              See exactly when transits will be exact with the timeline view. Plan ahead with precise dates for applying
              and separating aspects.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Chronological list of transit events',
                'Exact dates and times for aspect perfection',
                'Filter by planet, aspect type, or date range',
                'Retrograde and direct station markers',
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
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/timeline.webp"
              alt="Timeline - Transit events and exact aspect dates"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
