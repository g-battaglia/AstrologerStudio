'use client'

import { Github, Heart, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useScrollAnimation } from './useScrollAnimation'

export function OpenSourceSection() {
  const { sectionRef, isVisible } = useScrollAnimation()

  return (
    <section ref={sectionRef} className="relative z-10 px-4 py-20">
      <div className="mx-auto max-w-7xl text-center">
        <div
          className={`flex flex-col items-center justify-center gap-6 ${isVisible ? 'animate-on-scroll visible' : 'animate-on-scroll'}`}
        >
          {/* AGPLv3 License Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-green-500/30 bg-green-500/10">
            <Code2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">100% Open Source • AGPLv3 License</span>
          </div>

          <h2 className="text-3xl font-bold md:text-4xl text-foreground">
            Professional software with an <span className="gradient-text">Open Source Heart</span>
          </h2>

          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Astrologer Studio is fully open source</span>, licensed
            under the AGPLv3. It is built on top of <span className="font-semibold text-foreground">Kerykeion</span> and
            developed by the same team. Kerykeion is an industry-standard open-source astrology engine used by thousands
            of developers. We believe in transparency and the spirit of libre software.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 text-left max-w-4xl w-full">
            <div className="p-6 rounded-xl border bg-background/50 hover:bg-background/80 transition-colors">
              <Code2 className="h-6 w-6 text-indigo-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Transparency</h3>
              <p className="text-sm text-muted-foreground">
                Our core calculation engine is open for inspection. You know exactly how your charts are calculated.
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-background/50 hover:bg-background/80 transition-colors">
              <Heart className="h-6 w-6 text-pink-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sustainability</h3>
              <p className="text-sm text-muted-foreground">
                Your subscription directly funds the development of free software tools for the entire astrology
                community.
              </p>
            </div>

            <div className="p-6 rounded-xl border bg-background/50 hover:bg-background/80 transition-colors">
              <Github className="h-6 w-6 text-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Community</h3>
              <p className="text-sm text-muted-foreground">
                Join a project that values collaboration. Contribute code, report issues, or suggest features on GitHub.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="https://github.com/g-battaglia/AstrologerStudio"
              target="_blank"
              data-umami-event="opensource-astrologerstudio-github-click"
            >
              <Button size="lg" className="gap-2">
                <Github className="h-4 w-4" />
                Astrologer Studio
              </Button>
            </Link>
            <Link
              href="https://github.com/g-battaglia/kerykeion"
              target="_blank"
              data-umami-event="opensource-github-click"
            >
              <Button variant="outline" size="lg" className="gap-2">
                <Github className="h-4 w-4" />
                Kerykeion
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
