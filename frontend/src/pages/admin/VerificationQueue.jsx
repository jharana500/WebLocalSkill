import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Eye, ShieldCheck, ShieldX, Clock, RotateCcw, Copy, MoreHorizontal } from 'lucide-react'
import { Badge, VerifiedBadge, Pagination, TableRowSkeleton, Alert, Button } from '@/components/ui'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { useDebounce } from '@/hooks/useDebounce'
import { adminService } from '@/services/adminService'
import { toast } from '@/store/uiStore'
import { CompanyReviewModal } from '@/components/admin/CompanyReviewModal'

const TABS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'UNDER_REVIEW', label: 'Under Review' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DUPLICATE', label: 'Possible Duplicates' },
]

const STATUS_BADGE = {
  PENDING: 'warning',
  UNDER_REVIEW: 'primary',
  VERIFIED: 'success',
  REJECTED: 'danger',
  DUPLICATE: 'purple',
}

export default function VerificationQueue() {
  const [tab, setTab] = useState('PENDING')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalAction, setModalAction] = useState(null)
  const [activeCompany, setActiveCompany] = useState(null)
  const debouncedSearch = useDebounce(search, 400)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'verification-companies', { tab, page, debouncedSearch }],
    queryFn: () =>
      adminService.getCompanies({
        verificationStatus: tab,
        q: debouncedSearch || undefined,
        page,
        limit: 20,
      }),
    keepPreviousData: true,
  })

  const actionMutation = useMutation({
    mutationFn: ({ action, id, payload }) => {
      if (action === 'under-review') return adminService.markCompanyUnderReview(id, payload.reason)
      if (action === 'verify') return adminService.verifyCompany(id, payload.reason)
      if (action === 'reject') return adminService.rejectCompany(id, payload.reason)
      if (action === 'mark-duplicate') return adminService.markCompanyDuplicate(id, payload)
      if (action === 'restore') return adminService.restoreCompany(id, payload)
      return Promise.reject(new Error('Unknown action'))
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'verification-companies'] })
      toast.success('Updated', res?.message || 'Company updated')
      setModalAction(null)
      setActiveCompany(null)
    },
    onError: (err) => toast.error('Action failed', err.message || 'Please try again.'),
  })

  const openAction = (action, company) => {
    setModalAction(action)
    setActiveCompany(company)
  }

  const companies = data?.companies ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Company Verification</h1>
          <p className="text-slate-500 text-sm mt-1">Review registrations, detect duplicates, and manage verification status</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 flex-wrap">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setPage(1) }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  tab === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, registration, PAN, owner email..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
          </div>
        </div>

        {isError ? (
          <div className="px-5 py-12 text-center">
            <Alert type="error" message="Could not load companies." className="mb-4 text-left" />
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Company', 'Owner', 'Registration No.', 'PAN No.', 'Location', 'Status', 'Submitted', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={8} />)
                ) : companies.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-14 text-center text-slate-400">No companies in this tab</td></tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-900">{c.name}</span>
                          {c.isVerified && <VerifiedBadge />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{c.user?.email || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{c.verification?.registrationNumber || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{c.verification?.panNumber || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{c.district || '—'}</td>
                      <td className="px-4 py-3.5">
                        <Badge variant={STATUS_BADGE[c.verification?.status] || 'default'} size="xs">
                          {(c.verification?.status || 'PENDING').replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3.5">
                        <Dropdown trigger={
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                            <MoreHorizontal size={16} />
                          </button>
                        }>
                          <DropdownItem icon={Eye} onClick={() => navigate(`/admin/companies/${c.id}`)}>View Details</DropdownItem>
                          <DropdownItem icon={Copy} onClick={() => navigate(`/admin/companies/${c.id}?tab=duplicate`)}>Run Duplicate Check</DropdownItem>
                          <DropdownItem icon={Clock} onClick={() => openAction('under-review', c)}>Mark Under Review</DropdownItem>
                          <DropdownItem icon={ShieldCheck} onClick={() => openAction('verify', c)}>Verify</DropdownItem>
                          <DropdownItem icon={ShieldX} onClick={() => openAction('reject', c)}>Reject</DropdownItem>
                          <DropdownItem icon={RotateCcw} onClick={() => openAction('restore', c)}>Restore</DropdownItem>
                        </Dropdown>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing {companies.length} of {pagination.total}</p>
            <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <CompanyReviewModal
        open={!!modalAction}
        action={modalAction}
        company={activeCompany}
        onClose={() => { setModalAction(null); setActiveCompany(null) }}
        onConfirm={(payload) => actionMutation.mutate({ action: modalAction, id: activeCompany.id, payload })}
        loading={actionMutation.isPending}
      />
    </div>
  )
}
