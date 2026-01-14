import { ReactNode } from 'react'
import { getAdminSession } from '@/lib/security/admin-session'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

/**
 * Protected layout for authenticated admin pages
 * Wraps dashboard, users, usage pages with sidebar and header
 */
export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar role={session.role} />
      <div className="flex-1 flex flex-col">
        <AdminHeader username={session.username} role={session.role} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
