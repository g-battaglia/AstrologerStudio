'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar as ShadSidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import SidebarNav from '@/components/SidebarNav'
import { LogOut, Plus, User } from 'lucide-react'
import { useSidebarStore } from '@/stores/sidebar'
import { useCreateSubjectDialogStore } from '@/stores/createSubjectDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { GlobalCreateSubjectDialog } from '@/components/GlobalCreateSubjectDialog'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useSidebarStore()
  const { openDialog: openCreateSubjectDialog } = useCreateSubjectDialogStore()
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [sidebarFullyOpen, setSidebarFullyOpen] = React.useState(open)

  React.useEffect(() => {
    if (open) {
      const timeout = window.setTimeout(() => {
        setSidebarFullyOpen(true)
      }, 220)
      return () => window.clearTimeout(timeout)
    }

    setSidebarFullyOpen(false)
    return undefined
  }, [open])

  // Close mobile panel on route change (Sidebar handles mobile via Sheet with setOpenMobile)
  // We only need to ensure focus goes to main content.
  const mainRef = React.useRef<HTMLElement | null>(null)

  const focusMain = React.useEffectEvent(() => {
    mainRef.current?.focus()
  })

  React.useEffect(() => {
    focusMain()
  }, [pathname, focusMain])

  function CloseOnNavigate() {
    const { setOpenMobile } = useSidebar()
    React.useEffect(() => {
      setOpenMobile(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, setOpenMobile])
    return null
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <CloseOnNavigate />
      <ShadSidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center justify-between gap-2">
            <div
              className={cn(
                'pl-2 brand-heading font-semibold group-data-[collapsible=icon]:hidden transition-opacity duration-150 ease-linear whitespace-nowrap',
                isMobile || sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              Astrologer Studio
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle
                className={cn(
                  'group-data-[collapsible=icon]:hidden transition-opacity duration-150 ease-linear',
                  isMobile || sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
                )}
              />
              <SidebarTrigger aria-label="Toggle sidebar" />
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <div className="px-2 py-2">
          <Button
            variant="outline"
            className="w-full justify-start pl-2 pr-8 gap-2 overflow-hidden group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
            onClick={openCreateSubjectDialog}
          >
            <Plus className="size-4 shrink-0" />
            <span
              className={cn(
                'group-data-[collapsible=icon]:hidden transition-opacity duration-150 ease-linear whitespace-nowrap flex-1 text-center',
                isMobile || sidebarFullyOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
              )}
            >
              New Subject
            </span>
          </Button>
        </div>
        <SidebarSeparator />
        <SidebarNav />
        <SidebarSeparator />
        <SidebarFooter>
          {/* Expanded View */}
          <div className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden">
            <Link href="/settings?tab=account" className="flex-1 hover:opacity-80 transition-opacity">
              <div className="text-sm font-medium">{user?.username || 'Guest'}</div>
              <div className="text-xs text-muted-foreground">{user?.email || 'Not logged in'}</div>
            </Link>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => logout()} title="Logout">
              <LogOut className="size-4" />
            </Button>
          </div>
          {/* Collapsed View */}
          <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full py-2">
            <Link href="/settings?tab=account" title="Account Settings">
              <Button variant="ghost" size="icon" className="size-8">
                <User className="size-4" />
              </Button>
            </Link>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </ShadSidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background px-2 lg:hidden">
          <SidebarTrigger aria-label="Open sidebar" />
          <div className="flex flex-1 items-center justify-between">
            <div className="brand-heading font-medium">Astrologer Studio</div>
            <ThemeToggle />
          </div>
        </header>
        <main
          ref={mainRef}
          tabIndex={-1}
          aria-label="Main content"
          className="flex-1 p-4 lg:pt-0 outline-none overflow-x-hidden"
        >
          {children}
        </main>
      </SidebarInset>
      <GlobalCreateSubjectDialog />
    </SidebarProvider>
  )
}
