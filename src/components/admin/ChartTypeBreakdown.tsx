'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface ChartTypeBreakdownProps {
  data: { type: string; count: number }[]
}

const CHART_TYPE_LABELS: Record<string, string> = {
  natal: 'Natal',
  transit: 'Transits',
  transits: 'Transits',
  synastry: 'Synastry',
  composite: 'Composite',
  'solar-return': 'Solar Return',
  'lunar-return': 'Lunar Return',
  timeline: 'Timeline',
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#f43f5e', // rose
]

export function ChartTypeBreakdown({ data }: ChartTypeBreakdownProps) {
  const formattedData = data.map((item, idx) => ({
    name: CHART_TYPE_LABELS[item.type] || item.type,
    value: item.count,
    color: COLORS[idx % COLORS.length],
  }))

  const total = data.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Saved Charts by Type</h3>
      <p className="text-slate-400 text-sm mb-4">Total: {total.toLocaleString()} charts</p>

      {data.length === 0 ? (
        <p className="text-slate-500 text-center py-8">No saved charts yet</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formattedData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table breakdown */}
      <div className="mt-4 space-y-2">
        {formattedData.map((item) => (
          <div key={item.name} className="flex justify-between items-center">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 text-sm">{item.name}</span>
            </span>
            <span className="text-white font-medium">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
