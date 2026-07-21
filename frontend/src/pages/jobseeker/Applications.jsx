import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Clock, ChevronRight, FileText } from 'lucide-react'
import { EmptyState, Pagination } from '@/components/ui'
import { formatRelativeTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import { applicationService } from '@/services/applicationService'

const STATUS_CONFIG = {
  PENDING:    { label: 'Applied',       class: 'bg-blue-50 text-blue-700 border-blue-200' },
  REVIEWING:  { label: 'Under Review',  class: 'bg-amber-50 text-amber-700 border-amber-200' },
  SHORTLISTED:{ label: 'Shortlisted',   class: 'bg-purple-50 text-purple-700 border-purple-200' },
  HIRED:      { label: 'Hired',         class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:   { label: 'Rejected',      class: 'bg-red-50 text-red-700 border-red-200' },
  WITHDRAWN:  { label: 'Withdrawn',     class: 'bg-slate-50 text-slate-600 border-slate-200' },
}

const TAB_FILTERS = {
  all: () => true,
  active: (a) => ['PENDING', 'REVIEWING', 'SHORTLISTED'].includes(a.status),
  shortlisted: (a) => a.status === 'SHORTLISTED',
  hired: (a) => a.status === 'HIRED',
  closed: (a) => ['REJECTED', 'WITHDRAWN'].includes(a.status),
}

export default function Applications() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'me'],
    queryFn: () => applicationService.getMyApplications({ limit: 200 }),
    staleTime: 1000 * 60 * 2,
  })

  const allApplications = data?.applications || []

  const filtered = allApplications.filter(TAB_FILTERS[activeTab])
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const tabCounts = {
    all: allApplications.length,
    active: allApplications.filter(TAB_FILTERS.active).length,
    shortlisted: allApplications.filter(TAB_FILTERS.shortlisted).length,
    hired: allApplications.filter(TAB_FILTERS.hired).length,
    closed: allApplications.filter(TAB_FILTERS.closed).length,
  }

  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'shortlisted', label: 'Shortlisted' },
    { value: 'hired', label: 'Hired' },
    { value: 'closed', label: 'Closed' },
  ]

  const handleTabChange = (value) => { setActiveTab(value); setPage(1) }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isLoading ? 'Loading...' : `${allApplications.length} total applications tracked`}
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex items-center border-b border-slate-100 px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap',
                activeTab === tab.value
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                activeTab === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              )}>
                {isLoading ? '...' : tabCounts[tab.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/2 mb-1" />
                  <div className="h-3 bg-slate-50 rounded w-1/3" />
                </div>
                <div className="h-6 bg-slate-100 rounded-full w-20" />
              </div>
            ))
          ) : paginated.length === 0 ? (
            <EmptyState icon={FileText} title="No applications here" size="sm" />
          ) : (
            paginated.map(app => {
              const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING
              const company = app.job?.company
              const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'
              return (
                <div
                  key={app.id}
                  onClick={() => navigate(`/dashboard/applications/${app.id}`)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {company?.logoUrl ? (
                    <img src={company.logoUrl} alt={company.name} className="w-11 h-11 rounded-xl object-cover border border-slate-100 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{app.job?.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {company?.name}{app.job?.district ? ` · ${app.job.district}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', s.class)}>
                      {s.label}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {formatRelativeTime(app.createdAt)}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center p-5 border-t border-slate-100">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
