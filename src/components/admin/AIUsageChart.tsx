'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AIUsageChartProps {
  data: { date: string; count: number }[]
}

export function AIUsageChart({ data }: AIUsageChartProps) {
  const chartData = data.map((item) => ({
    date: item.date,
    displayDate: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: item.count,
  }))

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Daily AI Generations (Last 30 Days)</h3>
      {chartData.length === 0 ? (
        <p className="text-slate-400 text-sm">No usage data available</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="displayDate" stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#F8FAFC' }}
                itemStyle={{ color: '#8B5CF6' }}
                formatter={(value: number) => [value, 'Generations']}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8B5CF6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
