'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function DataTabFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Screenshot - left side */}
          <div
            className={`order-2 lg:order-1 relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}
          >
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/data.webp"
              alt="Chart Data Tab - Detailed planetary positions, aspects, and distributions"
            />
          </div>

          {/* Content - right side */}
          <div className={`order-1 lg:order-2 ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}>
            <Badge variant="secondary" className="mb-4">
              Chart Data
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Complete
              <span className="gradient-text-subtle"> Chart Analysis</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Every chart includes a comprehensive Data tab with all the details you need. Planetary positions, house
              placements, aspects, and element distributions at your fingertips.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Chart highlights with key placements',
                'Lunar phase and aspect details',
                'Element and quality distribution charts',
                'Complete planetary positions table',
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
