'use client'

// Import landing page styles
import './landing.css'

// Import sub-components
import { StarField } from './StarField'
import { LandingNavbar } from './LandingNavbar'
import { HeroSection } from './HeroSection'
import { OpenSourceSection } from './OpenSourceSection'
import {
  ChartsFeatureSection,
  DataTabFeatureSection,
  TransitFeatureSection,
  TransitGridFeatureSection,
  TimelineFeatureSection,
  EphemerisFeatureSection,
  EphemerisListFeatureSection,
  SubjectsFeatureSection,
  AIFeatureSection,
} from './FeatureShowcase'
import { HowItWorksSection, CTASection } from './CTASection'
import { PricingSection } from './PricingSection'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <div className="landing-page">
      {/* Subtle star field background */}
      <StarField />

      {/* Content */}
      <LandingNavbar />
      <main>
        <HeroSection />
        <ChartsFeatureSection />
        <DataTabFeatureSection />
        <TransitFeatureSection />
        <TransitGridFeatureSection />
        <TimelineFeatureSection />
        <EphemerisFeatureSection />
        <EphemerisListFeatureSection />
        <SubjectsFeatureSection />
        <AIFeatureSection />
        <PricingSection />
        <HowItWorksSection />
        <OpenSourceSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
