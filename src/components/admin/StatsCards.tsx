import { Users, UserPlus, Sparkles, TrendingUp } from 'lucide-react'

interface StatsCardsProps {
  totalUsers: number
  usersToday: number
  usersThisWeek: number
  usersThisMonth: number
  totalAIGenerations: number
  aiGenerationsToday: number
}

export function StatsCards({
  totalUsers,
  usersToday,
  usersThisWeek,
  usersThisMonth,
  totalAIGenerations,
  aiGenerationsToday,
}: StatsCardsProps) {
  const stats = [
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
      icon: Sparkles,
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'AI Generations Today',
      value: aiGenerationsToday.toLocaleString(),
      icon: TrendingUp,
      color: 'from-amber-500 to-amber-600',
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
