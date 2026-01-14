'use client'

/**
 * Choose Plan Header Component
 *
 * Simple header for the plan selection page with logo and logout button.
 *
 * @module app/choose-plan/ChoosePlanHeader
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ChoosePlanHeader() {
  const { logout } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-heading text-xl font-bold">Astrologer Studio</span>
        </Link>
      </div>
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  )
}
