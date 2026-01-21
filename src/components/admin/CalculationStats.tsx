'use client'

import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Calculator, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { clearCalculationHistory, type ClearHistoryTimeRange } from '@/actions/admin'
import { toast } from 'sonner'

interface CalculationStatsProps {
  // All-time and today stats (from getDashboardStats)
  totalCalculations: number
  calculationsToday: number
  calculationsByType: { type: string; count: number }[]
  calculationsTodayByType: { type: string; count: number }[]
  // Weekly and monthly stats
  calculationsThisWeek: number
  calculationsThisMonth: number
  calculationsByTypeThisWeek: { type: string; count: number }[]
  calculationsByTypeThisMonth: { type: string; count: number }[]
  // Role for permission check
  isSuperAdmin: boolean
  // Callback to refresh data after clearing
  onDataCleared?: () => void
}

const CHART_TYPE_LABELS: Record<string, string> = {
  natal: 'Natal',
  transit: 'Transits',
  synastry: 'Synastry',
  composite: 'Composite',
  'solar-return': 'Solar Return',
  'lunar-return': 'Lunar Return',
  now: 'Now Chart',
  timeline: 'Timeline',
}

type TimePeriod = 'today' | 'week' | 'month' | 'all'

export function CalculationStats({
  totalCalculations,
  calculationsToday,
  calculationsByType,
  calculationsTodayByType,
  calculationsThisWeek,
  calculationsThisMonth,
  calculationsByTypeThisWeek,
  calculationsByTypeThisMonth,
  isSuperAdmin,
  onDataCleared,
}: CalculationStatsProps) {
  const [viewPeriod, setViewPeriod] = useState<TimePeriod>('all')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearTimeRange, setClearTimeRange] = useState<ClearHistoryTimeRange>('day')
  const [isClearing, setIsClearing] = useState(false)

  // Get data based on selected view period
  const getDataForPeriod = () => {
    switch (viewPeriod) {
      case 'today':
        return {
          total: calculationsToday,
          byType: calculationsTodayByType,
        }
      case 'week':
        return {
          total: calculationsThisWeek,
          byType: calculationsByTypeThisWeek,
        }
      case 'month':
        return {
          total: calculationsThisMonth,
          byType: calculationsByTypeThisMonth,
        }
      case 'all':
      default:
        return {
          total: totalCalculations,
          byType: calculationsByType,
        }
    }
  }

  const currentData = getDataForPeriod()

  const chartData = currentData.byType.map((item) => ({
    name: CHART_TYPE_LABELS[item.type] || item.type,
    count: item.count,
    type: item.type,
  }))

  // Sort by count descending
  chartData.sort((a, b) => b.count - a.count)

  const handleClearHistory = async () => {
    setIsClearing(true)
    const result = await clearCalculationHistory(clearTimeRange)
    setIsClearing(false)
    setClearDialogOpen(false)

    if (result.success) {
      toast.success(`Cleared ${result.data?.deletedCount || 0} records`)
      onDataCleared?.()
    } else {
      toast.error(result.error || 'Failed to clear history')
    }
  }

  const periodLabels: Record<TimePeriod, string> = {
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    all: 'All Time',
  }

  const clearTimeRangeLabels: Record<ClearHistoryTimeRange, string> = {
    day: "Today's data",
    week: 'Last 7 days',
    month: 'Last 30 days',
    all: 'All history',
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calculator className="h-5 w-5 text-purple-400" />
          Chart Calculations
        </h3>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <Select value={viewPeriod} onValueChange={(v) => setViewPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-36 bg-slate-900/50 border-slate-600 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear History Button (superadmin only) */}
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div
          className={`bg-slate-900/50 rounded-lg p-4 cursor-pointer transition-all ${viewPeriod === 'today' ? 'ring-2 ring-purple-500' : 'hover:bg-slate-900/70'}`}
          onClick={() => setViewPeriod('today')}
        >
          <p className="text-2xl font-bold text-white">{calculationsToday.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Today</p>
        </div>
        <div
          className={`bg-slate-900/50 rounded-lg p-4 cursor-pointer transition-all ${viewPeriod === 'week' ? 'ring-2 ring-purple-500' : 'hover:bg-slate-900/70'}`}
          onClick={() => setViewPeriod('week')}
        >
          <p className="text-2xl font-bold text-white">{calculationsThisWeek.toLocaleString()}</p>
          <p className="text-xs text-slate-400">This Week</p>
        </div>
        <div
          className={`bg-slate-900/50 rounded-lg p-4 cursor-pointer transition-all ${viewPeriod === 'month' ? 'ring-2 ring-purple-500' : 'hover:bg-slate-900/70'}`}
          onClick={() => setViewPeriod('month')}
        >
          <p className="text-2xl font-bold text-white">{calculationsThisMonth.toLocaleString()}</p>
          <p className="text-xs text-slate-400">This Month</p>
        </div>
        <div
          className={`bg-slate-900/50 rounded-lg p-4 cursor-pointer transition-all ${viewPeriod === 'all' ? 'ring-2 ring-purple-500' : 'hover:bg-slate-900/70'}`}
          onClick={() => setViewPeriod('all')}
        >
          <p className="text-2xl font-bold text-white">{totalCalculations.toLocaleString()}</p>
          <p className="text-xs text-slate-400">All Time</p>
        </div>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toLocaleString(), periodLabels[viewPeriod]]}
              />
              <Bar dataKey="count" fill="#8b5cf6" name={periodLabels[viewPeriod]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-slate-500 text-center py-8">No calculations tracked for this period</p>
      )}

      {/* Table breakdown */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-slate-400 text-xs font-medium border-b border-slate-700 pb-2">
          <span>Chart Type</span>
          <span>{periodLabels[viewPeriod]}</span>
        </div>
        {chartData.map((item) => (
          <div key={item.name} className="flex justify-between items-center">
            <span className="text-slate-300 text-sm">{item.name}</span>
            <span className="text-white font-medium">{item.count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Clear History Dialog */}
      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Clear Calculation History
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This action cannot be undone. Select the time range to clear:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <Select value={clearTimeRange} onValueChange={(v) => setClearTimeRange(v as ClearHistoryTimeRange)}>
              <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today&apos;s data only</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
                <SelectItem value="all">All history (everything)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-slate-500 mt-2">
              This will delete {clearTimeRangeLabels[clearTimeRange]} from the calculation tracking database.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearHistory}
              className="bg-red-600 hover:bg-red-700"
              disabled={isClearing}
            >
              {isClearing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Clear {clearTimeRangeLabels[clearTimeRange]}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
