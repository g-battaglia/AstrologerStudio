import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import '@/css/index.css'
import { Providers } from './providers'
import { ReactNode } from 'react'
import { OrganizationJsonLd, WebApplicationJsonLd } from '@/components/JsonLd'

/**
 * Viewport configuration for responsive design
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

/**
 * Root metadata with comprehensive SEO
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://astrologerstudio.com'),
  title: {
    default: 'Astrologer Studio - Professional Astrology Application',
    template: '%s | Astrologer Studio',
  },
  description:
    'Professional astrology application for generating natal charts, transit charts, synastry charts, and ephemeris. Advanced astrological calculations with beautiful visualizations.',
  keywords: [
    'astrology',
    'natal chart',
    'birth chart',
    'horoscope',
    'synastry',
    'transit chart',
    'ephemeris',
    'astrological calculations',
    'open source astrology',
    'AGPL software',
    'professional astrologer tool',
  ],
  authors: [{ name: 'Astrologer Studio Team' }],
  creator: 'Astrologer Studio',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://astrologerstudio.com',
    siteName: 'Astrologer Studio',
    title: 'Astrologer Studio - Professional Astrology Application',
    description:
      'Professional, open-source astrology software for generating highly accurate natal charts, transit charts, synastry charts, and ephemeris.',
    images: [
      {
        url: '/screen/birth-chart.webp',
        width: 2880,
        height: 1629,
        alt: 'Astrologer Studio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Astrologer Studio - Professional Astrology Application',
    description:
      'Professional astrology application for generating natal charts, transit charts, synastry charts, and ephemeris.',
    images: ['/screen/birth-chart.webp'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
}

import localFont from 'next/font/local'

const berkshireSwash = localFont({
  src: '../assets/fonts/BerkshireSwash-Regular.woff2',
  weight: '400',
  variable: '--font-berkshire-swash',
  display: 'swap',
})

/**
 * Root layout component
 * Wraps all pages with providers and global styles
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const umamiScriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
  const umamiWebsiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <WebApplicationJsonLd />
      </head>
      <body suppressHydrationWarning className={berkshireSwash.variable}>
        <Providers>{children}</Providers>
        {umamiScriptUrl && umamiWebsiteId && (
          <Script defer src={umamiScriptUrl} data-website-id={umamiWebsiteId} strategy="afterInteractive" />
        )}
      </body>
    </html>
  )
}
