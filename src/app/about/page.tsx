import { Button } from '@/components/ui/button'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { Footer } from '@/components/landing/Footer'
import { StarField } from '@/components/landing/StarField'
import '@/components/landing/landing.css'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Linkedin, Github, Star } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About - Astrologer Studio',
  description: 'Learn about Astrologer Studio and its creator, Giacomo Battaglia.',
}

export const dynamic = 'force-static'

export default function AboutPage() {
  return (
    <div className="landing-page min-h-screen flex flex-col">
      <StarField />
      <LandingNavbar />

      <main className="grow pt-24 pb-16 px-4 md:px-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-16">
          {/* Hero Section */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-purple-400">
              Open Source Astrology
            </h1>
          </section>

          {/* Personal Story */}
          <section className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-8 md:p-10 shadow-xl space-y-6">
            <div className="space-y-4 text-lg text-foreground/90 leading-relaxed">
              <p>
                Astrologer Studio is an open-source astrology platform built for people who want reliable tools without
                opaque systems or unnecessary complexity.
              </p>

              <p>
                The project is <strong>100% AGPLv3 licensed</strong>. Every part of the codebase is open, auditable, and
                available under the same license, without dual licensing or closed components.
              </p>

              <p>
                Astrologer Studio is built on top of <strong>Kerykeion</strong>, a widely used astrology library, and
                focuses on correctness, clarity, and professional use rather than trends or visual shortcuts.
              </p>

              <p>
                I’m Giacomo, a developer and astrologer. I created Astrologer Studio to make professional astrology
                accessible in a way that is open, transparent, and technically solid. The calculations, assumptions, and
                design choices are meant to be visible and verifiable.
              </p>

              <p>
                Astrologer Studio follows the principles of <strong>free software</strong>. Free does not mean free of
                cost, but free as in freedom. The application is offered as a SaaS and is sustained through
                subscriptions, which fund development, maintenance, and long-term viability.
              </p>

              <p>
                The goal is simple: build serious astrology software that respects both the discipline and the people
                who use it.
              </p>
            </div>
          </section>

          {/* Creator/Contact Section */}
          <section className="bg-linear-to-br from-purple-900/20 to-transparent border border-purple-500/20 rounded-2xl p-8 md:p-10">
            <div className="space-y-4 text-center">
              <div className="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm font-medium mb-2">
                Connect With Me
              </div>
              <h2 className="text-3xl font-bold text-foreground">Giacomo Battaglia</h2>
              <p className="text-lg text-muted-foreground">Creator & Developer</p>
              <div className="space-y-4 text-foreground/90 leading-relaxed max-w-2xl mx-auto">
                <p>
                  This project is a labor of love. I'm constantly working to improve it, adding new features like AI
                  interpretations and deeper astronomical data.
                </p>
                <p>
                  If you have feedback, feature requests, or just want to talk astrology, feel free to reach out or
                  contribute on GitHub.
                </p>
              </div>
              <div className="pt-4 flex gap-4 justify-center flex-wrap">
                <Link href="https://www.linkedin.com/in/battaglia-giacomo/" target="_blank">
                  <Button variant="outline" size="sm">
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                </Link>
                <Link href="https://github.com/g-battaglia" target="_blank">
                  <Button variant="outline" size="sm">
                    <Github className="w-4 h-4 mr-2" />
                    My GitHub
                  </Button>
                </Link>
                <Link href="https://kerykeion.com" target="_blank">
                  <Button variant="secondary" size="sm">
                    <Star className="w-4 h-4 mr-2" />
                    Kerykeion
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
