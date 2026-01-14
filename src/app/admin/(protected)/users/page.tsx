import { UsersTable } from '@/components/admin/UsersTable'

/**
 * Users Management Page
 */
export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Users</h1>
        <p className="text-slate-400">Manage registered users and view their details</p>
      </div>

      <UsersTable />
    </div>
  )
}

export const metadata = {
  title: 'Users | Admin',
}
