import { getAdminSession } from '@/lib/security/admin-session'
import { redirect } from 'next/navigation'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

/**
 * Admin Login Page
 * Standalone page without the admin layout (no sidebar)
 */
export default async function AdminLoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await getAdminSession()
  if (session) {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Panel</h1>
          <p className="text-slate-400">Astrologer Studio Administration</p>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-8 shadow-2xl">
          <AdminLoginForm />
        </div>
        <p className="text-center text-slate-500 text-sm mt-6">
          This area is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Admin Login | Astrologer Studio',
}
