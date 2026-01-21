'use client'

import { Activity, AlertTriangle, Target, TrendingUp } from 'lucide-react'

interface EngagementMetricsProps {
  activeUsersToday: number
  activeUsersThisWeek: number
  activeUsersThisMonth: number
  retentionRate7d: number
  avgLoginsPerUser: number
  usersWithSubjects: number
  usersWithSavedCharts: number
  usersWithAIUsage: number
  inactiveUsers30d: number
  totalUsers: number
}

export function EngagementMetrics({
  activeUsersToday,
  activeUsersThisWeek,
  activeUsersThisMonth,
  retentionRate7d,
  avgLoginsPerUser,
  usersWithSubjects,
  usersWithSavedCharts,
  usersWithAIUsage,
  inactiveUsers30d,
  totalUsers,
}: EngagementMetricsProps) {
  const adoptionRate = totalUsers > 0 ? Math.round((usersWithSubjects / totalUsers) * 100) : 0
  const aiAdoptionRate = totalUsers > 0 ? Math.round((usersWithAIUsage / totalUsers) * 100) : 0
  const chartsAdoptionRate = totalUsers > 0 ? Math.round((usersWithSavedCharts / totalUsers) * 100) : 0
  const churnRisk = totalUsers > 0 ? Math.round((inactiveUsers30d / totalUsers) * 100) : 0

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
        <Activity className="h-5 w-5 text-blue-400" />
        Engagement Overview
      </h3>

      <div className="grid grid-cols-2 gap-6">
        {/* Active Users */}
        <div>
          <p className="text-slate-400 text-sm mb-2 flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Active Users
          </p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Today</span>
              <span className="text-white font-medium">{activeUsersToday}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">This Week</span>
              <span className="text-white font-medium">{activeUsersThisWeek}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">This Month</span>
              <span className="text-white font-medium">{activeUsersThisMonth}</span>
            </div>
          </div>
        </div>

        {/* Retention */}
        <div>
          <p className="text-slate-400 text-sm mb-2">Retention & Engagement</p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">7-Day Retention</span>
              <span
                className={`font-medium ${retentionRate7d >= 30 ? 'text-green-400' : retentionRate7d >= 15 ? 'text-yellow-400' : 'text-red-400'}`}
              >
                {retentionRate7d}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Avg Logins/User</span>
              <span className="text-white font-medium">{avgLoginsPerUser}</span>
            </div>
          </div>
        </div>

        {/* Feature Adoption */}
        <div>
          <p className="text-slate-400 text-sm mb-2 flex items-center gap-1">
            <Target className="h-4 w-4" />
            Feature Adoption
          </p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Created Subject</span>
              <span className="text-white font-medium">
                {usersWithSubjects} ({adoptionRate}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Saved Charts</span>
              <span className="text-white font-medium">
                {usersWithSavedCharts} ({chartsAdoptionRate}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Used AI</span>
              <span className="text-white font-medium">
                {usersWithAIUsage} ({aiAdoptionRate}%)
              </span>
            </div>
          </div>
        </div>

        {/* Health */}
        <div>
          <p className="text-slate-400 text-sm mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Health Indicators
          </p>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-300 text-sm">Inactive (30+ days)</span>
              <span
                className={`font-medium ${churnRisk >= 50 ? 'text-red-400' : churnRisk >= 30 ? 'text-yellow-400' : 'text-green-400'}`}
              >
                {inactiveUsers30d} ({churnRisk}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
