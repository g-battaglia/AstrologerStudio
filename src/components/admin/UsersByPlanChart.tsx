'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface UsersByPlanChartProps {
  data: { plan: string; count: number }[]
}

const COLORS = {
  free: '#6B7280',
  trial: '#3B82F6',
  pro: '#8B5CF6',
  lifetime: '#F59E0B',
}

export function UsersByPlanChart({ data }: UsersByPlanChartProps) {
  const chartData = data.map((item) => ({
    name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
    value: item.count,
    color: COLORS[item.plan as keyof typeof COLORS] || '#6B7280',
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Users by Plan</h3>
        <p className="text-slate-400 text-sm">No user data available</p>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Users by Plan</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #475569',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#F8FAFC' }}
              itemStyle={{ color: '#94A3B8' }}
            />
            <Legend
              wrapperStyle={{ color: '#94A3B8' }}
              formatter={(value) => <span className="text-slate-300">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
