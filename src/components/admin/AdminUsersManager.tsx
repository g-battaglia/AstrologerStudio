'use client'

import { useState } from 'react'
import { createAdminUser } from '@/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Loader2, Shield, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

export function AdminUsersManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin')

  const handleCreate = async () => {
    if (!username || !password) {
      toast.error('Username and password are required')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)
    const result = await createAdminUser(username, password, email || null, role)

    if (result.success) {
      toast.success('Admin user created successfully')
      setIsOpen(false)
      setUsername('')
      setPassword('')
      setEmail('')
      setRole('admin')
    } else {
      toast.error(result.error || 'Failed to create admin user')
    }
    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-slate-400 text-sm">
          Create and manage administrator accounts. Only superadmins can access this section.
        </p>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>Create Admin User</DialogTitle>
              <DialogDescription className="text-slate-400">Add a new administrator account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin_username"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="bg-slate-900/50 border-slate-600"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'superadmin')}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4" />
                        Superadmin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Superadmins can manage other admins and delete users</p>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <p className="text-slate-400 text-center py-8">
          Admin user listing coming soon. For now, use the CLI script:
          <br />
          <code className="text-blue-400 text-sm">
            bun run admin-scripts/create-admin.ts --username [name] --password [pass]
          </code>
        </p>
      </div>
    </div>
  )
}
