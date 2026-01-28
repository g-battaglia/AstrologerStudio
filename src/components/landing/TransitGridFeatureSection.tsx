'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function TransitGridFeatureSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 bg-muted/50 px-4 py-20 backdrop-blur-md">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Content */}
          <div className={`order-1 lg:order-2 ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}>
            <Badge variant="secondary" className="mb-4">
              Aspect Grid
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Complete
              <span className="gradient-text-subtle"> Aspect Overview</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              View all planetary aspects at a glance with our interactive aspect grid. Quickly identify harmonious and
              challenging configurations in any chart comparison.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Color-coded aspect types (conjunction, trine, square...)',
                'Orb values displayed for each aspect',
                'Filter by aspect type or planet',
                'Works with natal, transit, and synastry charts',
              ].map((item) => (
                <li key={item} className="text-sm text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshot */}
          <div
            className={`order-2 lg:order-1 relative ${isVisible ? 'animate-on-scroll visible stagger-2' : 'animate-on-scroll'}`}
          >
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/transit-grid.webp"
              alt="Transit Grid - Detailed aspect grid showing planetary relationships"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
