/**
 * Sidebar Navigation Component
 * Shows Pro badges for paid features when billing is enabled
 */
'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Settings,
  GitCommit,
  GitMerge,
  Calendar,
  Moon,
  Sun,
  Activity,
  FolderHeart,
  Table2,
  User,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils/cn'
import { SubjectSelectorDialog } from './SubjectSelectorDialog'
import { Subject } from '@/types/subjects'
import { useSubscription } from '@/lib/subscription/hooks'
import { isDodoPaymentsEnabled } from '@/lib/subscription/config'

export type NavItem = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  to: string
  external?: boolean
  badge?: string | number
  action?: string
  isPro?: boolean // Mark pro-only features
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export type SidebarNavProps = {
  groups?: NavGroup[]
}

const defaultGroups: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { icon: Home, label: 'Home', to: '/dashboard' },
      { icon: Users, label: 'Subjects', to: '/subjects' },
      { icon: FolderHeart, label: 'Saved Calculations', to: '/saved-calculations' },
      { icon: Table2, label: 'Ephemeris', to: '/ephemeris' },
      { icon: Calendar, label: 'Timeline', to: '#', action: 'timeline', isPro: true },
    ],
  },
  {
    title: 'Charts',
    items: [
      { icon: User, label: 'Natal Chart', to: '#', action: 'natal' },
      { icon: Activity, label: 'Transits', to: '#', action: 'transits', isPro: true },
      { icon: GitMerge, label: 'Synastry', to: '#', action: 'synastry', isPro: true },
      { icon: GitCommit, label: 'Composite', to: '#', action: 'composite', isPro: true },
      { icon: Sun, label: 'Solar Return', to: '#', action: 'solar-return', isPro: true },
      { icon: Moon, label: 'Lunar Return', to: '#', action: 'lunar-return', isPro: true },
    ],
  },
  {
    title: 'System',
    items: [
      {
        icon: Settings,
        label: 'Settings',
        to: '/settings',
      },
      {
        icon: HelpCircle,
        label: 'User Manual',
        to: '/manual',
      },
      { icon: ShieldCheck, label: 'Policies', to: '/legal' },
    ],
  },
]

export function SidebarNav({ groups = defaultGroups }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [activeAction, setActiveAction] = React.useState<string | null>(null)

  // Check if user has pro access
  const billingEnabled = isDodoPaymentsEnabled()
  const { data: subscription, isLoading } = useSubscription()
  // User is free if: billing is enabled AND plan is 'free' or undefined
  const isFreeUser = billingEnabled && !isLoading && (subscription?.plan === 'free' || !subscription?.plan)

  const isActive = (to: string) => {
    if (to === '#' || to === '') return false
    if (to === '/dashboard') return pathname === '/dashboard'
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  const handleItemClick = (e: React.MouseEvent, item: NavItem) => {
    // Block pro features for free users
    if (item.isPro && isFreeUser) {
      e.preventDefault()
      router.push('/pricing')
      return
    }

    if (item.action) {
      e.preventDefault()
      setActiveAction(item.action)
      setDialogOpen(true)
    }
  }

  const handleSubjectSelect = (subject: Subject) => {
    if (activeAction) {
      router.push(`/subjects/${subject.id}/${activeAction}`)
      setDialogOpen(false)
    }
  }

  return (
    <>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    {item.external ? (
                      <SidebarMenuButton asChild tooltip={item.label}>
                        <a
                          href={item.to}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn('flex items-center gap-2')}
                        >
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </a>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild={!(item.isPro && isFreeUser)}
                        tooltip={item.isPro && isFreeUser ? `${item.label} (Pro)` : item.label}
                        isActive={isActive(item.to)}
                        onClick={(e) => handleItemClick(e, item)}
                        className={cn(item.isPro && isFreeUser && 'opacity-50 cursor-not-allowed')}
                      >
                        {item.isPro && isFreeUser ? (
                          // Disabled button for free users - no Link wrapper
                          <span className="flex items-center gap-2">
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </span>
                        ) : (
                          <Link
                            href={item.to}
                            className={cn('flex items-center gap-2')}
                            aria-current={isActive(item.to) ? 'page' : undefined}
                          >
                            <item.icon className="size-4" />
                            <span>{item.label}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    )}
                    {item.badge != null && (
                      <SidebarMenuBadge aria-label={`${item.badge} items`}>{item.badge}</SidebarMenuBadge>
                    )}
                    {/* Show PRO badge for pro features when user is on free plan */}
                    {item.isPro && isFreeUser && (
                      <SidebarMenuBadge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-semibold px-1.5 py-0.5 h-auto">
                        PRO
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SubjectSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSubjectSelect}
        title={`Select subject for ${activeAction ? activeAction.replace('-', ' ') : 'calculation'}`}
      />
    </>
  )
}

export default SidebarNav
