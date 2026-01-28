import { LandingPage } from '@/components/LandingPage'
import type { Metadata } from 'next'

// Force static generation at build time
export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: {
    absolute: 'Astrologer Studio - Professional Astrology Software',
  },
  description:
    'Astrologer Studio is a professional astrology workspace for accurate natal charts, transits, synastry, composite charts, ephemeris, and AI interpretations.',
  alternates: {
    canonical: '/',
  },
}

/**
 * Root Page - Static Landing Page
 */
export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Astrologer Studio',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    url: 'https://astrologerstudio.com/',
    description:
      'Open-source professional astrology software for accurate natal charts, transits, synastry, composite charts, ephemeris, and AI interpretations.',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage />
    </>
  )
}
