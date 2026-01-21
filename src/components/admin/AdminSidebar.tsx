'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, BarChart3, Settings, Shield, Calculator } from 'lucide-react'
import { clsx } from 'clsx'

interface AdminSidebarProps {
  role: 'admin' | 'superadmin'
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'AI Usage', href: '/admin/usage', icon: BarChart3 },
  { name: 'Calculations', href: '/admin/calculations', icon: Calculator },
]

const superadminNavigation = [{ name: 'Admin Users', href: '/admin/settings', icon: Settings }]

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()

  const allNavigation = role === 'superadmin' ? [...navigation, ...superadminNavigation] : navigation

  return (
    <aside className="w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-slate-400">Astrologer Studio</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {allNavigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="px-4 py-2 bg-slate-900/50 rounded-lg">
          <p className="text-xs text-slate-400">Role</p>
          <p className="text-sm font-medium text-white capitalize">{role}</p>
        </div>
      </div>
    </aside>
  )
}
