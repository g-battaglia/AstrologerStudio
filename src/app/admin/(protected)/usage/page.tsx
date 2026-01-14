import { getAIUsageStats } from '@/actions/admin'
import { AIUsageChart } from '@/components/admin/AIUsageChart'
import { TopUsersTable } from '@/components/admin/TopUsersTable'
import { UsageByPlanTable } from '@/components/admin/UsageByPlanTable'
import { AlertCircle } from 'lucide-react'

/**
 * AI Usage Statistics Page
 */
export default async function UsagePage() {
  const result = await getAIUsageStats(30)

  if (!result.success) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 flex items-center gap-4">
        <AlertCircle className="h-6 w-6 text-red-400" />
        <div>
          <h3 className="text-red-400 font-medium">Error loading usage data</h3>
          <p className="text-red-300/70 text-sm">{result.error}</p>
        </div>
      </div>
    )
  }

  const stats = result.data!

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">AI Usage Statistics</h1>
        <p className="text-slate-400">Monitor AI interpretation usage across the platform</p>
      </div>

      <AIUsageChart data={stats.dailyUsage} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopUsersTable data={stats.topUsers} />
        <UsageByPlanTable data={stats.usageByPlan} />
      </div>
    </div>
  )
}

export const metadata = {
  title: 'AI Usage | Admin',
}
