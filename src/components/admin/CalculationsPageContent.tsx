'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Calculator, Trash2, Loader2, AlertTriangle, RefreshCw, TrendingUp, Calendar, PieChartIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartLoadingSkeleton } from '@/components/ui/chart-loading-skeleton'
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
import {
  getDashboardStats,
  clearCalculationHistory,
  getTopUsersByCalculations,
  searchUsers,
  getCalculationStats,
  type CalculationStatsResult,
  type ClearHistoryTimeRange,
  type TopUserByCalculations,
} from '@/actions/admin'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils/cn'
import { useDebounce } from '@/hooks/use-debounce'
import { clientLogger } from '@/lib/logging/client'
import { TIME_PERIOD_COLORS, getAdminChartColor } from '@/lib/config/chart-colors'

// Dynamically import chart components to avoid loading recharts in the initial bundle
const AdminBarChartContent = dynamic(
  () => import('@/components/admin/AdminChartContent').then((mod) => mod.AdminBarChartContent),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={288} variant="admin" /> },
)
const AdminPieChartContent = dynamic(
  () => import('@/components/admin/AdminChartContent').then((mod) => mod.AdminPieChartContent),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={288} variant="admin" /> },
)
const AdminAreaChartContent = dynamic(
  () => import('@/components/admin/AdminChartContent').then((mod) => mod.AdminAreaChartContent),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={288} variant="admin" /> },
)
const AdminMultiBarChartContent = dynamic(
  () => import('@/components/admin/AdminChartContent').then((mod) => mod.AdminMultiBarChartContent),
  { ssr: false, loading: () => <ChartLoadingSkeleton height={288} variant="admin" /> },
)

interface CalculationsPageContentProps {
  isSuperAdmin: boolean
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

// Common interface for stats
type PageData = CalculationStatsResult

export function CalculationsPageContent({ isSuperAdmin }: CalculationsPageContentProps) {
  const router = useRouter()
  const [data, setData] = useState<PageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [viewPeriod, setViewPeriod] = useState<TimePeriod>('all')
  const [clearDialogOpen, setClearDialogOpen] = useState(false)
  const [clearTimeRange, setClearTimeRange] = useState<ClearHistoryTimeRange>('day')
  const [isClearing, setIsClearing] = useState(false)
  const [topUsers, setTopUsers] = useState<TopUserByCalculations[]>([])
  const isMountedRef = useRef(true)

  // User Filter State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserLabel, setSelectedUserLabel] = useState<string | null>(null)
  const [userSearchOpen, setUserSearchOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; username: string; email: string | null }[]>(
    [],
  )
  const debouncedSearchQuery = useDebounce(userSearchQuery, 300)

  // Search users effect
  useEffect(() => {
    let mounted = true

    const search = async () => {
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) {
        setUserSearchResults([])
        return
      }
      const result = await searchUsers(debouncedSearchQuery)
      if (mounted && result.success && result.data) {
        setUserSearchResults(result.data)
      }
    }
    search()

    return () => {
      mounted = false
    }
  }, [debouncedSearchQuery])

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    try {
      if (selectedUserId) {
        // Fetch filtered data for specific user
        const result = await getCalculationStats(selectedUserId)
        if (isMountedRef.current && result.success && result.data) {
          setData(result.data)
        }
        // When filtering by user, we don't show top users
        if (isMountedRef.current) {
          setTopUsers([])
        }
      } else {
        // Fetch global data
        const [statsResult, topUsersResult] = await Promise.all([getDashboardStats(), getTopUsersByCalculations(15)])

        if (isMountedRef.current && statsResult.success && statsResult.data) {
          setData(statsResult.data)
        }
        if (isMountedRef.current && topUsersResult.success && topUsersResult.data) {
          setTopUsers(topUsersResult.data)
        }
      }
    } catch (error) {
      clientLogger.error('Failed to fetch calculation data:', error)
      if (isMountedRef.current) {
        toast.error('Failed to load calculation data')
      }
    }

    if (isMountedRef.current) {
      setIsLoading(false)
    }
  }, [selectedUserId])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Get data based on selected view period
  const getDataForPeriod = () => {
    if (!data) return { total: 0, byType: [] as { type: string; count: number }[] }

    switch (viewPeriod) {
      case 'today':
        return {
          total: data.calculationsToday,
          byType: data.calculationsTodayByType,
        }
      case 'week':
        return {
          total: data.calculationsThisWeek,
          byType: data.calculationsByTypeThisWeek,
        }
      case 'month':
        return {
          total: data.calculationsThisMonth,
          byType: data.calculationsByTypeThisMonth,
        }
      case 'all':
      default:
        return {
          total: data.totalCalculations,
          byType: data.calculationsByType,
        }
    }
  }

  const currentData = getDataForPeriod()

  // Format data for charts
  const barChartData = currentData.byType
    .map((item) => ({
      name: CHART_TYPE_LABELS[item.type] || item.type,
      count: item.count,
      type: item.type,
    }))
    .sort((a, b) => b.count - a.count)

  const pieChartData = currentData.byType.map((item, idx) => ({
    name: CHART_TYPE_LABELS[item.type] || item.type,
    value: item.count,
    color: getAdminChartColor(idx),
  }))

  // Comparison data for time period comparison
  const comparisonData = data
    ? [
        { period: 'Today', count: data.calculationsToday },
        { period: 'This Week', count: data.calculationsThisWeek },
        { period: 'This Month', count: data.calculationsThisMonth },
        { period: 'All Time', count: data.totalCalculations },
      ]
    : []

  // Usage by type across periods
  const usageComparisonData = data
    ? data.calculationsByType.map((item) => ({
        name: CHART_TYPE_LABELS[item.type] || item.type,
        today: data.calculationsTodayByType.find((t) => t.type === item.type)?.count || 0,
        week: data.calculationsByTypeThisWeek.find((t) => t.type === item.type)?.count || 0,
        month: data.calculationsByTypeThisMonth.find((t) => t.type === item.type)?.count || 0,
        total: item.count,
      }))
    : []

  const handleClearHistory = async () => {
    setIsClearing(true)
    const result = await clearCalculationHistory(clearTimeRange)
    setIsClearing(false)
    setClearDialogOpen(false)

    if (result.success) {
      toast.success(`Cleared ${result.data?.deletedCount || 0} records`)
      fetchData()
      router.refresh()
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
        <p className="text-red-400">Failed to load calculation data</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Calculator className="h-7 w-7 text-purple-400" />
            Chart Calculations
          </h1>
          <p className="text-slate-400">Detailed analytics for chart calculation usage</p>
        </div>

        <div className="flex items-center gap-3">
          {/* User Filter */}
          <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={userSearchOpen}
                className="w-[250px] justify-between border-slate-700 text-slate-300"
              >
                {selectedUserId ? selectedUserLabel : 'Filter by user...'}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0 bg-slate-800 border-slate-700">
              <Command className="bg-transparent border-none">
                <CommandInput
                  placeholder="Search user..."
                  value={userSearchQuery}
                  onValueChange={setUserSearchQuery}
                  className="text-white"
                />
                <CommandList>
                  <CommandEmpty>No user found.</CommandEmpty>
                  <CommandGroup>
                    {userSearchResults.map((user) => (
                      <CommandItem
                        key={user.id}
                        onSelect={() => {
                          setSelectedUserId(user.id)
                          setSelectedUserLabel(user.username)
                          setUserSearchOpen(false)
                          // Don't reset results here - let the effect handle it when query changes
                          setUserSearchQuery('')
                        }}
                        className="text-slate-300 aria-selected:bg-slate-700 aria-selected:text-white"
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', selectedUserId === user.id ? 'opacity-100' : 'opacity-0')}
                        />
                        <div className="flex flex-col">
                          <span>{user.username}</span>
                          {user.email && <span className="text-xs text-slate-500">{user.email}</span>}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {selectedUserId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedUserId(null)
                setSelectedUserLabel(null)
              }}
              className="h-9 w-9 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          <Button size="sm" variant="outline" className="border-slate-600" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          {isSuperAdmin && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={() => setClearDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear History
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 cursor-pointer transition-all ${viewPeriod === 'today' ? 'ring-2 ring-purple-500' : 'hover:border-slate-600'}`}
          onClick={() => setViewPeriod('today')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{data.calculationsToday.toLocaleString()}</p>
          <p className="text-sm text-slate-400">Today</p>
        </div>

        <div
          className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 cursor-pointer transition-all ${viewPeriod === 'week' ? 'ring-2 ring-purple-500' : 'hover:border-slate-600'}`}
          onClick={() => setViewPeriod('week')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{data.calculationsThisWeek.toLocaleString()}</p>
          <p className="text-sm text-slate-400">This Week</p>
        </div>

        <div
          className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 cursor-pointer transition-all ${viewPeriod === 'month' ? 'ring-2 ring-purple-500' : 'hover:border-slate-600'}`}
          onClick={() => setViewPeriod('month')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{data.calculationsThisMonth.toLocaleString()}</p>
          <p className="text-sm text-slate-400">This Month</p>
        </div>

        <div
          className={`bg-slate-800/50 border border-slate-700 rounded-xl p-6 cursor-pointer transition-all ${viewPeriod === 'all' ? 'ring-2 ring-purple-500' : 'hover:border-slate-600'}`}
          onClick={() => setViewPeriod('all')}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Calculator className="h-5 w-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">{data.totalCalculations.toLocaleString()}</p>
          <p className="text-sm text-slate-400">All Time</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Usage by Type */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Calculator className="h-5 w-5 text-purple-400" />
              Usage by Chart Type
            </h2>
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
          </div>

          {barChartData.length > 0 ? (
            <div className="h-72">
              <AdminBarChartContent
                data={barChartData}
                layout="vertical"
                xAxisType="number"
                yAxisType="category"
                yAxisWidth={100}
                tooltipFormatter={(value) => [value.toLocaleString(), periodLabels[viewPeriod]]}
                margin={{ left: 20 }}
              />
            </div>
          ) : (
            <p className="text-slate-500 text-center py-16">No calculations for this period</p>
          )}
        </div>

        {/* Pie Chart - Distribution */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-pink-400" />
            Distribution ({periodLabels[viewPeriod]})
          </h2>

          {pieChartData.length > 0 && currentData.total > 0 ? (
            <div className="h-72">
              <AdminPieChartContent
                data={pieChartData}
                outerRadius={90}
                labelFormatter={({ name, percent }: { name: string; percent: number }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              />
            </div>
          ) : (
            <p className="text-slate-500 text-center py-16">No calculations for this period</p>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period Comparison - Area Chart */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-cyan-400" />
            Period Comparison
          </h2>

          <div className="h-72">
            <AdminAreaChartContent
              data={comparisonData}
              dataKeyX="period"
              dataKeyY="count"
              tooltipFormatter={(value) => [value.toLocaleString(), 'Calculations']}
            />
          </div>
        </div>

        {/* Multi-period comparison by type */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            Usage Comparison by Type
          </h2>

          <div className="h-72">
            <AdminMultiBarChartContent
              data={usageComparisonData}
              xAxisAngle={-45}
              xAxisTextAnchor="end"
              xAxisHeight={60}
              bars={[
                { dataKey: 'today', name: 'Today', fill: TIME_PERIOD_COLORS.today },
                { dataKey: 'week', name: 'Week', fill: TIME_PERIOD_COLORS.week },
                { dataKey: 'month', name: 'Month', fill: TIME_PERIOD_COLORS.month },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Detailed Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Chart Type</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Today</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">This Week</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">This Month</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">All Time</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {usageComparisonData.map((item, idx) => (
                <tr key={item.name} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getAdminChartColor(idx) }} />
                      <span className="text-white font-medium">{item.name}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-300">{item.today.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-300">{item.week.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-300">{item.month.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-white font-medium">{item.total.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-purple-400">
                    {data.totalCalculations > 0 ? ((item.total / data.totalCalculations) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-900/50">
                <td className="py-3 px-4 text-white font-bold">Total</td>
                <td className="text-right py-3 px-4 text-white font-bold">{data.calculationsToday.toLocaleString()}</td>
                <td className="text-right py-3 px-4 text-white font-bold">
                  {data.calculationsThisWeek.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 text-white font-bold">
                  {data.calculationsThisMonth.toLocaleString()}
                </td>
                <td className="text-right py-3 px-4 text-white font-bold">{data.totalCalculations.toLocaleString()}</td>
                <td className="text-right py-3 px-4 text-purple-400 font-bold">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Users by Calculations */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-400" />
          Top Users by Calculations
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">#</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Username</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Plan</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Today</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Week</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Month</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No calculation data yet
                  </td>
                </tr>
              ) : (
                topUsers.map((user, idx) => (
                  <tr key={user.userId} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="text-white font-medium">{user.username}</span>
                        {user.email && <span className="text-xs text-slate-500 ml-2">{user.email}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          user.subscriptionPlan === 'pro'
                            ? 'bg-purple-500/20 text-purple-400'
                            : user.subscriptionPlan === 'trial'
                              ? 'bg-blue-500/20 text-blue-400'
                              : user.subscriptionPlan === 'lifetime'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {user.subscriptionPlan}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4 text-slate-300">{user.calculationsToday.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 text-slate-300">
                      {user.calculationsThisWeek.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-slate-300">
                      {user.calculationsThisMonth.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-purple-400 font-medium">
                      {user.calculationsTotal.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
              This will permanently delete {clearTimeRangeLabels[clearTimeRange]} from the calculation tracking
              database.
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
