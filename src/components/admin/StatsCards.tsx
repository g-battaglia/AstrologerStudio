import { Users, UserPlus, Sparkles, TrendingUp, Activity, RefreshCw, Target, AlertTriangle } from 'lucide-react'

interface StatsCardsProps {
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  usersThisMonth: number
  totalAIGenerations: number
  aiGenerationsToday: number
  // Engagement metrics
  activeUsersToday: number
  activeUsersThisWeek: number
  retentionRate7d: number
  usersWithSubjects: number
  usersWithAIUsage: number
  inactiveUsers30d: number
}

export function StatsCards({
  totalUsers,
  usersToday,
  usersThisWeek,
  usersThisMonth: _usersThisMonth,
  totalAIGenerations,
  aiGenerationsToday,
  activeUsersToday,
  activeUsersThisWeek,
  retentionRate7d,
  usersWithSubjects,
  usersWithAIUsage,
  inactiveUsers30d,
}: StatsCardsProps) {
  const subjectsAdoptionRate = totalUsers > 0 ? Math.round((usersWithSubjects / totalUsers) * 100) : 0
  const aiAdoptionRate = totalUsers > 0 ? Math.round((usersWithAIUsage / totalUsers) * 100) : 0
  const churnRisk = totalUsers > 0 ? Math.round((inactiveUsers30d / totalUsers) * 100) : 0

  const stats = [
    // Row 1 - Core metrics
    {
      name: 'Total Users',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'New Today',
      value: usersToday.toLocaleString(),
      subtext: `${usersThisWeek} this week`,
      icon: UserPlus,
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'AI Generations (Total)',
      value: totalAIGenerations.toLocaleString(),
      subtext: `${usersWithAIUsage} users (${aiAdoptionRate}%)`,
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'AI Generations Today',
      value: aiGenerationsToday.toLocaleString(),
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-600',
    },
    // Row 2 - Engagement metrics
    {
      name: 'Active Today',
      value: activeUsersToday.toLocaleString(),
      subtext: `${activeUsersThisWeek} this week`,
      icon: Activity,
      color: 'from-cyan-500 to-cyan-600',
    },
    {
      name: '7-Day Retention',
      value: `${retentionRate7d}%`,
      subtext: retentionRate7d >= 30 ? 'Healthy' : retentionRate7d >= 15 ? 'Moderate' : 'Needs attention',
      icon: RefreshCw,
      color:
        retentionRate7d >= 30
          ? 'from-green-500 to-green-600'
          : retentionRate7d >= 15
            ? 'from-yellow-500 to-yellow-600'
            : 'from-red-500 to-red-600',
    },
    {
      name: 'Feature Adoption',
      value: `${subjectsAdoptionRate}%`,
      subtext: `${usersWithSubjects} users with subjects`,
      icon: Target,
      color: 'from-teal-500 to-teal-600',
    },
    {
      name: 'Inactive (30+ days)',
      value: inactiveUsers30d.toLocaleString(),
      subtext: `${churnRisk}% of users`,
      icon: AlertTriangle,
      color:
        churnRisk >= 50
          ? 'from-red-500 to-red-600'
          : churnRisk >= 30
            ? 'from-yellow-500 to-yellow-600'
            : 'from-slate-500 to-slate-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`h-12 w-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
          <p className="text-sm text-slate-400">{stat.name}</p>
          {stat.subtext && <p className="text-xs text-slate-500 mt-1">{stat.subtext}</p>}
        </div>
      ))}
    </div>
  )
}
