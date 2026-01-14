import { getAdminSession } from '@/lib/security/admin-session'
import { redirect } from 'next/navigation'
import { getDashboardStats } from '@/actions/admin'
import { StatsCards } from '@/components/admin/StatsCards'
import { UsersByPlanChart } from '@/components/admin/UsersByPlanChart'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'
import { AlertCircle } from 'lucide-react'

/**
 * Admin Dashboard Page (at /admin)
 * Shows key statistics and quick overview
 */
export default async function AdminDashboardPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const result = await getDashboardStats()

  return (
    <div className="min-h-screen bg-slate-900 flex">
      <AdminSidebar role={session.role} />
      <div className="flex-1 flex flex-col">
        <AdminHeader username={session.username} role={session.role} />
        <main className="flex-1 p-6 overflow-auto">
          {!result.success ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="text-red-400 font-medium">Error loading dashboard</h3>
                <p className="text-red-300/70 text-sm">{result.error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-slate-400">Overview of your application statistics</p>
              </div>

              <StatsCards
                totalUsers={result.data!.totalUsers}
                usersToday={result.data!.usersToday}
                usersThisWeek={result.data!.usersThisWeek}
                usersThisMonth={result.data!.usersThisMonth}
                totalAIGenerations={result.data!.totalAIGenerations}
                aiGenerationsToday={result.data!.aiGenerationsToday}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <UsersByPlanChart data={result.data!.usersByPlan} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard | Admin',
}
