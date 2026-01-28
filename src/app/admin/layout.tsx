import { ReactNode } from 'react'

/**
 * Root layout for /admin routes
 * Handles authentication check for all admin pages except /admin/login
 */
export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  // This is just a pass-through layout
  // Auth checking is done in individual page layouts
  return <>{children}</>
}

/**
 * Metadata for admin section
 */
export const metadata = {
  title: 'Admin | Astrologer Studio',
  robots: 'noindex, nofollow', // Don't index admin pages
}
