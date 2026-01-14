import { getAdminSession } from '@/lib/security/admin-session'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AdminUsersManager } from '@/components/admin/AdminUsersManager'

/**
 * Admin Settings Page (superadmin only)
 * Manage admin users
 */
export default async function AdminSettingsPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  // Only superadmins can access this page
  if (session.role !== 'superadmin') {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar role={session.role} />
      <div className="flex-1 flex flex-col">
        <AdminHeader username={session.username} role={session.role} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Admin Users</h1>
              <p className="text-slate-400">Manage administrator accounts (superadmin only)</p>
            </div>
            <AdminUsersManager />
          </div>
        </main>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Settings | Admin',
}
