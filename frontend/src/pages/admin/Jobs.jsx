import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, MoreHorizontal, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Badge, Pagination } from '@/components/ui'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { TableRowSkeleton } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'
import { adminService } from '@/services/adminService'
import { toast } from '@/store/uiStore'

const TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time',
  CONTRACT: 'Contract', REMOTE: 'Remote',
  FREELANCE: 'Freelance', INTERNSHIP: 'Internship',
}
const STATUS_TABS = ['all', 'active', 'inactive']

export default function AdminJobs() {
  const [search, setSearch] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'jobs', { page, statusTab, search }],
    queryFn: () => adminService.getJobs({
      page,
      limit: 20,
      q: search || undefined,
      status: statusTab !== 'all' ? statusTab : undefined,
    }),
    keepPreviousData: true,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => adminService.updateJobStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin', 'jobs'])
      toast.success('Updated', 'Job status changed')
    },
    onError: (err) => toast.error('Error', err.message),
  })

  const jobs = data?.jobs ?? []
  const pagination = data?.pagination

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">{pagination?.total ?? 0} total job listings</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex gap-1 flex-wrap">
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
              placeholder="Search jobs..."
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Job Title', 'Company', 'Type', 'Status', 'Applications', 'Posted', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              ) : isError ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-red-500">Failed to load jobs</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400">No jobs found</td></tr>
              ) : jobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-medium text-slate-900">{job.title}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{job.company?.name}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant="default" size="xs">{TYPE_LABELS[job.jobType] || job.jobType}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant={job.isActive ? 'success' : 'default'} size="xs">
                      {job.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{job._count?.applications ?? 0}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-500">{formatDate(job.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <Dropdown trigger={
                      <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    }>
                      <DropdownItem icon={Eye} onClick={() => navigate(`/jobs/${job.id}`)}>View Job</DropdownItem>
                      <DropdownItem
                        icon={job.isActive ? EyeOff : Eye}
                        onClick={() => updateStatus.mutate({ id: job.id, status: job.isActive ? 'inactive' : 'active' })}
                      >
                        {job.isActive ? 'Unpublish' : 'Publish'}
                      </DropdownItem>
                    </Dropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {jobs.length} of {pagination?.total ?? 0}</p>
          {pagination && <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </div>
      </div>
    </div>
  )
}
