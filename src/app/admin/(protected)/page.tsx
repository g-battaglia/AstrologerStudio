import { getDashboardStats } from '@/actions/admin'
import { DashboardContent } from '@/components/admin/DashboardContent'
import { getAdminSession } from '@/lib/security/admin-session'
import { AlertCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

/**
 * Admin Dashboard Page (in protected layout)
 * Shows key statistics and quick overview
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const result = await getDashboardStats()

  if (!result.success) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <div>
          <h3 className="text-red-400 font-medium">Error loading dashboard</h3>
          <p className="text-red-300/70 text-sm">{result.error}</p>
        </div>
      </div>
    )
  }

  return <DashboardContent data={result.data!} isSuperAdmin={session.role === 'superadmin'} />
}

export const metadata = {
  title: 'Dashboard | Admin',
}
