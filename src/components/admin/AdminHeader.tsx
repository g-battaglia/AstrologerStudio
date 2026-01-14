'use client'

import { useRouter } from 'next/navigation'
import { adminLogout } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AdminHeaderProps {
  username: string
  role: 'admin' | 'superadmin'
}

export function AdminHeader({ username, role }: AdminHeaderProps) {
  const router = useRouter()

  async function handleLogout() {
    await adminLogout()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Administration</h2>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-3 text-slate-300 hover:text-white hover:bg-slate-700/50"
          >
            <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">{username}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
