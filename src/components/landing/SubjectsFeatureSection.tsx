'use client'

import { LandingScreenshot } from './LandingScreenshot'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from './useScrollAnimation'

export function SubjectsFeatureSection() {
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
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/data.webp"
              alt="Data Management - Subject database with complete birth data"
            />
          </div>

          {/* Content */}
          <div className={`order-1 lg:order-2 ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}>
            <Badge variant="secondary" className="mb-4">
              Data Management
            </Badge>
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              Organize Your
              <span className="gradient-text-subtle"> Client Database</span>
            </h2>
            <p className="mb-6 text-muted-foreground">
              Store unlimited profiles with complete birth data, notes, and tags. Quick access to any client&apos;s
              charts and readings in seconds.
            </p>
            <ul className="list-disc list-outside space-y-3 pl-5">
              {[
                'Complete birth data with location lookup',
                'Rodden rating for data accuracy',
                'Tags and notes for organization',
                'Quick search and filter',
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
