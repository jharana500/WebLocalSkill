import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, MoreHorizontal, UserCheck, UserX, Eye } from 'lucide-react'
import { Badge, Pagination } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { TableRowSkeleton } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { adminService } from '@/services/adminService'
import { toast } from '@/store/uiStore'

const ROLE_TABS = ['all', 'job_seeker', 'company']

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', { page, roleTab, search }],
    queryFn: () => adminService.getUsers({ page, limit: 20, q: search || undefined, role: roleTab !== 'all' ? roleTab : undefined }),
    keepPreviousData: true,
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }) => isActive ? adminService.deactivateUser(id) : adminService.activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'users'])
      toast.success('Updated', 'User status changed')
    },
    onError: (err) => toast.error('Error', err.message),
  })

  const users = data?.users ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">{pagination?.total ?? 0} total registered users</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1">
            {ROLE_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setRoleTab(tab); setPage(1) }}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors', roleTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}
              >
                {tab === 'job_seeker' ? 'Job Seekers' : tab === 'company' ? 'Companies' : 'All'}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['User', 'Role', 'Status', 'Joined', 'Activity', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              ) : isError ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-red-500">Failed to load users</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No users found</td></tr>
              ) : users.map(user => {
                const name = user.profile
                  ? `${user.profile.firstName} ${user.profile.lastName}`.trim()
                  : user.company?.name || user.email
                const isActive = user.isActive

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} size="sm" src={user.profile?.avatarUrl || user.company?.logoUrl} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={user.role === 'COMPANY' ? 'purple' : 'primary'} size="xs">
                        {user.role === 'COMPANY' ? 'Company' : 'Job Seeker'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={isActive ? 'success' : 'danger'} size="xs">
                        {isActive ? 'Active' : 'Suspended'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">
                      {user.role === 'JOB_SEEKER' ? `${user._count?.applications ?? 0} applications` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Dropdown trigger={
                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      }>
                        <DropdownItem icon={Eye} onClick={() => navigate(`/admin/users/${user.id}`)}>View Profile</DropdownItem>
                        <DropdownItem
                          icon={isActive ? UserX : UserCheck}
                          onClick={() => toggleActive.mutate({ id: user.id, isActive })}
                        >
                          {isActive ? 'Suspend User' : 'Activate User'}
                        </DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {users.length} of {pagination?.total ?? 0} users</p>
          {pagination && (
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          )}
        </div>
      </div>
    </div>
  )
}
