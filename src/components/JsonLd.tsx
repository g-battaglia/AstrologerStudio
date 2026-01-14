/**
 * JSON-LD Structured Data Component for SEO
 * Provides Schema.org markup for better search engine visibility
 */

export function OrganizationJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Astrologer Studio',
    url: 'https://astrologerstudio.com',
    logo: 'https://astrologerstudio.com/favicon.ico',
    description:
      'Professional, open-source astrology software for generating highly accurate natal charts, transit charts, synastry charts, and ephemeris.',
    sameAs: ['https://github.com/g-battaglia/AstrologerStudio'],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
}

export function WebApplicationJsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Astrologer Studio',
    url: 'https://astrologerstudio.com',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Professional astrology application for generating natal charts, transit charts, synastry charts, and ephemeris. Advanced astrological calculations with beautiful visualizations.',
    featureList: [
      'Natal Chart Generation',
      'Transit Chart Calculation',
      'Synastry Chart Analysis',
      'Ephemeris Tables',
      'Professional Astrological Calculations',
    ],
    screenshot: 'https://astrologerstudio.com/screen/birth-chart.webp',
    softwareVersion: '1.0',
    author: {
      '@type': 'Person',
      name: 'Giacomo Battaglia',
    },
    license: 'https://www.gnu.org/licenses/agpl-3.0.html',
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
}
