interface UsageByPlanTableProps {
  data: { plan: string; totalCount: number; userCount: number }[]
}

export function UsageByPlanTable({ data }: UsageByPlanTableProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Usage by Subscription Plan</h3>
      {data.length === 0 ? (
        <p className="text-slate-400 text-sm">No usage data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-sm font-medium text-slate-400">Plan</th>
                <th className="text-right px-3 py-2 text-sm font-medium text-slate-400">Users</th>
                <th className="text-right px-3 py-2 text-sm font-medium text-slate-400">Total Generations</th>
                <th className="text-right px-3 py-2 text-sm font-medium text-slate-400">Avg/User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.map((row) => (
                <tr key={row.plan} className="hover:bg-slate-700/20">
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${
                        row.plan === 'pro'
                          ? 'bg-purple-500/20 text-purple-400'
                          : row.plan === 'trial'
                            ? 'bg-blue-500/20 text-blue-400'
                            : row.plan === 'lifetime'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {row.plan}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-300 text-right">{row.userCount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-sm text-white text-right font-medium">
                    {row.totalCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-slate-400 text-right">
                    {row.userCount > 0 ? Math.round(row.totalCount / row.userCount).toLocaleString() : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
