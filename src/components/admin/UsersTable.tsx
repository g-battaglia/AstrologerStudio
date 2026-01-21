'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getUsers,
  getUserDetails,
  updateUserPlan,
  deleteUser,
  type UserListItem,
  type UserDetail,
} from '@/actions/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
  Trash2,
  Edit,
  MoreHorizontal,
  ArrowUpDown,
  Calculator,
  Columns,
} from 'lucide-react'
import { toast } from 'sonner'

/**
 * Format a date as relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffDays > 30) {
    return date.toLocaleDateString()
  } else if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHrs > 0) {
    return `${diffHrs}h ago`
  } else if (diffMin > 0) {
    return `${diffMin}m ago`
  } else {
    return 'Just now'
  }
}

export function UsersTable() {
  const [users, setUsers] = useState<UserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastLoginAt' | 'lastActiveAt'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isLoading, setIsLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null)
  const [userToEdit, setUserToEdit] = useState<UserListItem | null>(null)
  const [newPlan, setNewPlan] = useState('')
  const [isActionLoading, setIsActionLoading] = useState(false)

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    email: true,
    plan: true,
    created: true,
    lastLogin: true,
    lastActive: true,
    logins: true,
    subjects: true,
    charts: true,
    calculations: true,
    aiGenerations: true,
  })

  const toggleColumn = (column: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [column]: !prev[column] }))
  }

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    const result = await getUsers(page, pageSize, search || undefined, planFilter || undefined, sortBy, sortOrder)
    if (result.success && result.data) {
      setUsers(result.data.users)
      setTotal(result.data.total)
    }
    setIsLoading(false)
  }, [page, pageSize, search, planFilter, sortBy, sortOrder])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  const handleViewDetails = async (userId: string) => {
    setIsActionLoading(true)
    const result = await getUserDetails(userId)
    if (result.success && result.data) {
      setSelectedUser(result.data)
      setIsDetailOpen(true)
    } else {
      toast.error('Failed to load user details')
    }
    setIsActionLoading(false)
  }

  const handleEditPlan = (user: UserDetail) => {
    setNewPlan(user.subscriptionPlan)
    setUserToEdit(null) // Clear quick edit
    setIsEditOpen(true)
  }

  const handleQuickEditPlan = (user: UserListItem) => {
    setNewPlan(user.subscriptionPlan)
    setUserToEdit(user)
    setSelectedUser(null) // Clear detail view
    setIsEditOpen(true)
  }

  const handleSavePlan = async () => {
    const userId = selectedUser?.id || userToEdit?.id
    if (!userId) return
    setIsActionLoading(true)
    const result = await updateUserPlan(userId, newPlan)
    if (result.success) {
      toast.success('User plan updated successfully')
      setIsEditOpen(false)
      setIsDetailOpen(false)
      setUserToEdit(null)
      fetchUsers()
    } else {
      toast.error(result.error || 'Failed to update plan')
    }
    setIsActionLoading(false)
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    setIsActionLoading(true)
    const result = await deleteUser(userToDelete.id)
    if (result.success) {
      toast.success('User deleted successfully')
      setIsDeleteOpen(false)
      setUserToDelete(null)
      fetchUsers()
    } else {
      toast.error(result.error || 'Failed to delete user')
    }
    setIsActionLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <Select
          value={planFilter || 'all'}
          onValueChange={(v) => {
            setPlanFilter(v === 'all' ? '' : v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="lifetime">Lifetime</SelectItem>
          </SelectContent>
        </Select>

        {/* Column Visibility Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300">
              <Columns className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {Object.entries(visibleColumns).map(([key, visible]) => (
              <DropdownMenuItem
                key={key}
                onClick={() => toggleColumn(key as keyof typeof visibleColumns)}
                className="flex items-center justify-between"
              >
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                {visible && <span className="text-green-400">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="hover:bg-transparent border-b-slate-700">
              <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Username</TableHead>
              {visibleColumns.email && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Email</TableHead>
              )}
              {visibleColumns.plan && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Plan</TableHead>
              )}
              {visibleColumns.created && (
                <TableHead
                  className="text-left px-4 py-3 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => {
                    if (sortBy === 'createdAt') {
                      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                    } else {
                      setSortBy('createdAt')
                      setSortOrder('desc')
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    Created
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'createdAt' ? 'text-blue-400' : ''}`} />
                  </span>
                </TableHead>
              )}
              {visibleColumns.lastLogin && (
                <TableHead
                  className="text-left px-4 py-3 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => {
                    if (sortBy === 'lastLoginAt') {
                      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                    } else {
                      setSortBy('lastLoginAt')
                      setSortOrder('desc')
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    Last Login
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'lastLoginAt' ? 'text-blue-400' : ''}`} />
                  </span>
                </TableHead>
              )}
              {visibleColumns.lastActive && (
                <TableHead
                  className="text-left px-4 py-3 text-sm font-medium text-slate-400 cursor-pointer hover:text-white"
                  onClick={() => {
                    if (sortBy === 'lastActiveAt') {
                      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                    } else {
                      setSortBy('lastActiveAt')
                      setSortOrder('desc')
                    }
                  }}
                >
                  <span className="flex items-center gap-1">
                    Last Active
                    <ArrowUpDown className={`h-3 w-3 ${sortBy === 'lastActiveAt' ? 'text-blue-400' : ''}`} />
                  </span>
                </TableHead>
              )}
              {visibleColumns.logins && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Logins</TableHead>
              )}
              {visibleColumns.subjects && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Subjects</TableHead>
              )}
              {visibleColumns.charts && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">Charts</TableHead>
              )}
              {visibleColumns.calculations && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Calcs
                  </span>
                </TableHead>
              )}
              {visibleColumns.aiGenerations && (
                <TableHead className="text-left px-4 py-3 text-sm font-medium text-slate-400">AI</TableHead>
              )}
              <TableHead className="text-right px-4 py-3 text-sm font-medium text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-700/50">
            {isLoading ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow className="hover:bg-transparent border-none">
                <TableCell colSpan={10} className="px-4 py-8 text-center text-slate-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id} className="hover:bg-slate-700/20 border-b-slate-700/50">
                  <TableCell className="px-4 py-3 text-sm text-white font-medium">{user.username}</TableCell>
                  {visibleColumns.email && (
                    <TableCell className="px-4 py-3 text-sm text-slate-300">{user.email || '-'}</TableCell>
                  )}
                  {visibleColumns.plan && (
                    <TableCell className="px-4 py-3">
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
                    </TableCell>
                  )}
                  {visibleColumns.created && (
                    <TableCell className="px-4 py-3 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  )}
                  {visibleColumns.lastLogin && (
                    <TableCell className="px-4 py-3 text-sm text-slate-400">
                      {user.lastLoginAt ? formatRelativeTime(new Date(user.lastLoginAt)) : 'Never'}
                    </TableCell>
                  )}
                  {visibleColumns.lastActive && (
                    <TableCell className="px-4 py-3 text-sm text-slate-400">
                      {user.lastActiveAt ? formatRelativeTime(new Date(user.lastActiveAt)) : 'Never'}
                    </TableCell>
                  )}
                  {visibleColumns.logins && (
                    <TableCell className="px-4 py-3 text-sm text-slate-300">{user.loginCount}</TableCell>
                  )}
                  {visibleColumns.subjects && (
                    <TableCell className="px-4 py-3 text-sm text-slate-300">{user.subjectsCount}</TableCell>
                  )}
                  {visibleColumns.charts && (
                    <TableCell className="px-4 py-3 text-sm text-slate-300">{user.savedChartsCount}</TableCell>
                  )}
                  {visibleColumns.calculations && (
                    <TableCell className="px-4 py-3 text-sm text-purple-400 font-medium">
                      {user.calculationsTotal.toLocaleString()}
                    </TableCell>
                  )}
                  {visibleColumns.aiGenerations && (
                    <TableCell className="px-4 py-3 text-sm text-cyan-400">{user.aiGenerationsTotal}</TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleViewDetails(user.id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickEditPlan(user)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Change Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setUserToDelete(user)
                            setIsDeleteOpen(true)
                          }}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
          <p className="text-sm text-slate-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="border-slate-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages || 1}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="border-slate-700"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              Detailed information about the selected user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400">Username</p>
                  <p className="text-white">{selectedUser.username}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-white">{selectedUser.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="text-white">
                    {selectedUser.firstName || selectedUser.lastName
                      ? `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Auth Provider</p>
                  <p className="text-white capitalize">{selectedUser.authProvider}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Subscription Plan</p>
                  <div className="flex items-center gap-2">
                    <p className="text-white capitalize">{selectedUser.subscriptionPlan}</p>
                    <Button size="sm" variant="ghost" onClick={() => handleEditPlan(selectedUser)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-400">AI Generations (Today)</p>
                  <p className="text-white">{selectedUser.todayAIUsage}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">AI Generations (Total)</p>
                  <p className="text-white">{selectedUser.aiGenerationsTotal}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Subjects</p>
                  <p className="text-white">{selectedUser.subjectsCount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Saved Charts</p>
                  <p className="text-white">{selectedUser.savedChartsCount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Last Login</p>
                  <p className="text-white">
                    {selectedUser.lastLoginAt ? formatRelativeTime(new Date(selectedUser.lastLoginAt)) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Login Count</p>
                  <p className="text-white">{selectedUser.loginCount}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Last Active</p>
                  <p className="text-white">
                    {selectedUser.lastActiveAt ? formatRelativeTime(new Date(selectedUser.lastActiveAt)) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Created</p>
                  <p className="text-white">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Edit Subscription Plan</DialogTitle>
            <DialogDescription className="text-slate-400">Change the subscription plan for this user</DialogDescription>
          </DialogHeader>
          <Select value={newPlan} onValueChange={setNewPlan}>
            <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="lifetime">Lifetime</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePlan} disabled={isActionLoading}>
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete user &quot;{userToDelete?.username}&quot;? This action cannot be undone
              and will delete all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={isActionLoading}
            >
              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
