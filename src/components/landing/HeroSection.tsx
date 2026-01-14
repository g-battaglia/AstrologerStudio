'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { LandingScreenshot } from './LandingScreenshot'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-[90vh] overflow-hidden px-4 pt-32 pb-20 lg:pt-0 lg:pb-0 lg:flex lg:items-center">
      {/* Decorative zodiac ring - Adjusted position for responsive layout */}
      <div
        className="zodiac-ring hidden lg:block"
        style={{
          width: '800px',
          height: '800px',
          top: '50%',
          right: '-20%',
          left: 'auto',
          transform: 'translateY(-50%)',
          opacity: 0.15,
        }}
      />

      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text Content */}
          <div className="relative z-10 text-center lg:text-left">
            <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              <span className="gradient-text">Professional Astrology Software</span>
              <br />
              <span className="text-foreground">Made for working astrologers.</span>
            </h1>

            <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
              A clean workflow for charts, transits, synastry, and ephemerides. Fast results, transparent logic. Any
              device, any screen.
            </p>

            <div className="flex flex-col items-center gap-3 sm:flex-row justify-center lg:justify-start w-full sm:w-auto">
              <Link href="/register" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[180px] gap-2"
                  data-umami-event="hero-start-trial-click"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/share/birthchart" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto sm:min-w-[180px] gap-2"
                  data-umami-event="hero-birth-chart-click"
                >
                  Free Birth Chart
                </Button>
              </Link>
            </div>
          </div>

          {/* Image/Preview */}
          <div
            className={`relative z-10 ${isVisible ? 'animate-in fade-in slide-in-from-bottom-8 duration-1000' : 'opacity-0'}`}
          >
            <LandingScreenshot
              src="https://cdn.statically.io/gh/g-battaglia/AstrologerStudio@main/CDN/screenshots/birth-chart.webp"
              alt="Astrologer Studio Dashboard - Natal Chart"
              aspectRatio="16/10"
              priority
            />
            {/* Background glow effect behind the image */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-3xl -z-10 rounded-[2rem] opacity-50" />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <button
        onClick={() => {
          document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="absolute inset-x-0 bottom-6 z-20 mx-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-border bg-background/50 backdrop-blur-sm transition-all hover:border-foreground hover:bg-background lg:bottom-10"
        style={{ animation: 'bounce-subtle 2s ease-in-out infinite' }}
        aria-label="Scroll to features"
        data-umami-event="hero-scroll-features-click"
      >
        <ChevronDown className="h-6 w-6 text-muted-foreground" />
      </button>
    </section>
  )
}
