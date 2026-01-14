interface TopUsersTableProps {
  data: { userId: string; username: string; count: number }[]
}

export function TopUsersTable({ data }: TopUsersTableProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Users by AI Usage</h3>
      {data.length === 0 ? (
        <p className="text-slate-400 text-sm">No usage data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-sm font-medium text-slate-400">#</th>
                <th className="text-left px-3 py-2 text-sm font-medium text-slate-400">Username</th>
                <th className="text-right px-3 py-2 text-sm font-medium text-slate-400">Generations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.map((user, index) => (
                <tr key={user.userId} className="hover:bg-slate-700/20">
                  <td className="px-3 py-2 text-sm text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2 text-sm text-white font-medium">{user.username}</td>
                  <td className="px-3 py-2 text-sm text-slate-300 text-right">{user.count.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
