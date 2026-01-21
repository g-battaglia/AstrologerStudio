import { getAdminSession } from '@/lib/security/admin-session'
import { redirect } from 'next/navigation'
import { CalculationsPageContent } from '@/components/admin/CalculationsPageContent'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

/**
 * Admin Chart Calculations Page
 * Detailed analytics for chart calculation usage
 */
export default async function AdminCalculationsPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar role={session.role} />
      <div className="flex-1 flex flex-col">
        <AdminHeader username={session.username} role={session.role} />
        <main className="flex-1 p-6 overflow-auto">
          <CalculationsPageContent isSuperAdmin={session.role === 'superadmin'} />
        </main>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Chart Calculations | Admin',
}
