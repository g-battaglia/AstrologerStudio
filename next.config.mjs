/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimized Docker deployments
  // Reduces image size from ~1GB to ~100MB and memory usage significantly
  output: 'standalone',
  // Security headers
  async headers() {
    // Environment-based CSP configuration
    const isProduction = process.env.NODE_ENV === 'production'
    // Note: 'wasm-unsafe-eval' is required for @react-pdf/renderer which uses WebAssembly
    const scriptSrc = isProduction
      ? "'self' 'unsafe-inline' 'wasm-unsafe-eval' https://www.google.com https://www.gstatic.com https://libre-astrology.vercel.app"
      : "'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://www.google.com https://www.gstatic.com https://libre-astrology.vercel.app"

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'X-Permitted-Cross-Domain-Policies',
            value: 'none',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://secure.geonames.org https://openrouter.ai https://www.google.com https://api.dodopayments.com https://libre-astrology.vercel.app",
              "frame-src 'self' blob: https://www.google.com https://app.dodopayments.com https://*.dodopayments.com",
              "frame-ancestors 'self'",
              "form-action 'self'",
              "base-uri 'self'",
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Experimental features
  experimental: {
    // Enable Server Actions (stable in Next.js 14+)
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.statically.io',
        pathname: '/gh/g-battaglia/AstrologerStudio@main/CDN/**',
      },
    ],
  },

  // Powered by header disabled for security
  poweredByHeader: false,
}

export default nextConfig
