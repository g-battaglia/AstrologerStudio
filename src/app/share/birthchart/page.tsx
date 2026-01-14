import type { Metadata } from 'next'
import { Suspense } from 'react'
import { TryBirthChartView } from './TryBirthChartView'

export const metadata: Metadata = {
  title: 'Free Birth Chart Calculator - Astrologer Studio',
  description:
    'Generate your free natal birth chart instantly. Discover your planetary positions, houses, and aspects. No registration required.',
  alternates: {
    canonical: '/share/birthchart',
  },
  openGraph: {
    title: 'Free Birth Chart Calculator',
    description:
      'Generate your free natal birth chart instantly. Discover your planetary positions, houses, and aspects.',
    type: 'website',
  },
}

/**
 * Public Birth Chart Page
 *
 * Allows users to test the birth chart functionality without registration.
 * CTAs redirect to registration funnel for premium features.
 */
export default function TryBirthChartPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Free Birth Chart Calculator',
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    url: 'https://astrologerstudio.com/share/birthchart',
    description: 'Generate your free natal birth chart instantly with accurate planetary positions.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <TryBirthChartView />
      </Suspense>
    </>
  )
}
