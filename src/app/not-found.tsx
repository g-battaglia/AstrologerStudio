'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="text-7xl font-bold tracking-tight">404</h1>
        <p className="mt-2 text-balance text-lg text-neutral-600 dark:text-neutral-300">
          The page you are looking for does not exist or has been moved.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    </div>
  )
}
