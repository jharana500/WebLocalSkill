import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, MoreHorizontal, Eye, ShieldCheck, ShieldOff } from 'lucide-react'
import { Badge, VerifiedBadge, Pagination } from '@/components/ui'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { TableRowSkeleton } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { adminService } from '@/services/adminService'
import { toast } from '@/store/uiStore'

const PLAN_BADGE = { FREE: 'default', STARTER: 'default', GROWTH: 'primary', ENTERPRISE: 'purple' }
const STATUS_TABS = ['all', 'active', 'suspended']

export default function AdminCompanies() {
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'companies', { page, statusTab, search }],
    queryFn: () => adminService.getCompanies({
      page,
      limit: 20,
      q: search || undefined,
      status: statusTab !== 'all' ? statusTab : undefined,
    }),
    keepPreviousData: true,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => adminService.updateCompanyStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'companies'])
      toast.success('Updated', 'Company status changed')
    },
    onError: (err) => toast.error('Error', err.message),
  })

  const companies = data?.companies ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-slate-500 text-sm mt-1">{pagination?.total ?? 0} registered companies</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setStatusTab(tab); setPage(1) }}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors', statusTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50')}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search companies..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Company', 'Industry', 'Plan', 'Status', 'Active Jobs', 'Joined', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : isError ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-red-500">Failed to load companies</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No companies found</td></tr>
              ) : companies.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.logoUrl ? (
                        <img src={c.logoUrl} alt={c.name} className="w-8 h-8 rounded-lg object-cover border border-slate-100" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-900">{c.name}</span>
                          {c.isVerified && <VerifiedBadge />}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{c.industry || '—'}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={PLAN_BADGE[c.plan] || 'default'} size="xs" className="capitalize">{c.plan?.toLowerCase()}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={c.status === 'ACTIVE' ? 'success' : 'danger'} size="xs">{c.status?.toLowerCase()}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{c._count?.jobs ?? 0}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(c.user?.createdAt || c.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Dropdown trigger={
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    }>
                      <DropdownItem icon={Eye} onClick={() => navigate(`/admin/companies/${c.id}`)}>View Details</DropdownItem>
                      <DropdownItem
                        icon={c.status === 'ACTIVE' ? ShieldOff : ShieldCheck}
                        onClick={() => updateStatus.mutate({ id: c.id, status: c.status === 'ACTIVE' ? 'suspended' : 'active' })}
                      >
                        {c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </DropdownItem>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {companies.length} of {pagination?.total ?? 0}</p>
          {pagination && <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </div>
      </div>
    </div>
  )
}
