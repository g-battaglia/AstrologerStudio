'use client'

import Link from 'next/link'
import { StatsCards } from '@/components/admin/StatsCards'
import { UsersByPlanChart } from '@/components/admin/UsersByPlanChart'
import { ChartTypeBreakdown } from '@/components/admin/ChartTypeBreakdown'
import { EngagementMetrics } from '@/components/admin/EngagementMetrics'
import { Calculator, ArrowRight } from 'lucide-react'
import type { DashboardStats } from '@/actions/admin'

interface DashboardContentProps {
  data: DashboardStats
  isSuperAdmin: boolean
}

export function DashboardContent({ data, isSuperAdmin: _isSuperAdmin }: DashboardContentProps) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your application statistics</p>
      </div>

      <StatsCards
        totalUsers={data.totalUsers}
        usersToday={data.usersToday}
        usersThisWeek={data.usersThisWeek}
        usersThisMonth={data.usersThisMonth}
        totalAIGenerations={data.totalAIGenerations}
        aiGenerationsToday={data.aiGenerationsToday}
        activeUsersToday={data.activeUsersToday}
        activeUsersThisWeek={data.activeUsersThisWeek}
        retentionRate7d={data.retentionRate7d}
        usersWithSubjects={data.usersWithSubjects}
        usersWithAIUsage={data.usersWithAIUsage}
        inactiveUsers30d={data.inactiveUsers30d}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsersByPlanChart data={data.usersByPlan} />
        <ChartTypeBreakdown data={data.savedChartsByType} />
      </div>

      <EngagementMetrics
        activeUsersToday={data.activeUsersToday}
        activeUsersThisWeek={data.activeUsersThisWeek}
        activeUsersThisMonth={data.activeUsersThisMonth}
        retentionRate7d={data.retentionRate7d}
        avgLoginsPerUser={data.avgLoginsPerUser}
        usersWithSubjects={data.usersWithSubjects}
        usersWithSavedCharts={data.usersWithSavedCharts}
        usersWithAIUsage={data.usersWithAIUsage}
        inactiveUsers30d={data.inactiveUsers30d}
        totalUsers={data.totalUsers}
      />

      {/* Quick Summary Card - Calculations */}
      <Link
        href="/admin/calculations"
        className="block bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calculator className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Chart Calculations</h3>
              <p className="text-slate-400 text-sm">
                {data.totalCalculations.toLocaleString()} total · {data.calculationsToday.toLocaleString()} today
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-purple-400 group-hover:text-purple-300">
            <span className="text-sm">View Details</span>
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </Link>
    </div>
  )
}
