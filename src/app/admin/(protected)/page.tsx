import { getDashboardStats } from '@/actions/admin'
import { StatsCards } from '@/components/admin/StatsCards'
import { UsersByPlanChart } from '@/components/admin/UsersByPlanChart'
import { AlertCircle } from 'lucide-react'

/**
 * Admin Dashboard Page
 * Shows key statistics and quick overview
 */
export default async function AdminDashboardPage() {
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

  const stats = result.data!

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your application statistics</p>
      </div>

      <StatsCards
        totalUsers={stats.totalUsers}
        usersToday={stats.usersToday}
        usersThisWeek={stats.usersThisWeek}
        usersThisMonth={stats.usersThisMonth}
        totalAIGenerations={stats.totalAIGenerations}
        aiGenerationsToday={stats.aiGenerationsToday}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsersByPlanChart data={stats.usersByPlan} />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Dashboard | Admin',
}
