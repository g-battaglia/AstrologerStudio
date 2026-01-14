import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'

export function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center border-b border-border bg-background/80 backdrop-blur-md px-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-heading whitespace-nowrap text-sm font-medium md:text-lg">Astrologer Studio</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/register">
            <Button
              size="sm"
              className="gradient-bg-animated font-bold shadow-md transition-transform hover:scale-105"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
              data-umami-event="nav-get-started-click"
            >
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
