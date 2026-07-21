import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Eye, BarChart2, MoreVertical } from 'lucide-react'
import { Button, Badge, EmptyState, Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui'
import { SearchBar } from '@/components/ui/SearchBar'
import { cn } from '@/utils/cn'
import { jobService } from '@/services/jobService'
import { formatDate } from '@/utils/formatters'

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

export default function ManageJobs() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['company', 'jobs'],
    queryFn: () => jobService.getCompanyJobs({ limit: 100 }),
    staleTime: 1000 * 60 * 2,
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => jobService.toggleJobStatus(id),
    onSuccess: () => queryClient.invalidateQueries(['company', 'jobs']),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => jobService.deleteJob(id),
    onSuccess: () => queryClient.invalidateQueries(['company', 'jobs']),
  })

  const allJobs = data?.jobs || data || []
  const filtered = allJobs.filter(j =>
    (!search || j.title.toLowerCase().includes(search.toLowerCase())) &&
    (statusFilter === 'all' || (statusFilter === 'active' ? j.isActive : !j.isActive))
  )

  const activeCount = allJobs.filter(j => j.isActive).length

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isLoading ? 'Loading...' : `${activeCount} active listings`}
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/company/post-job')}>Post New Job</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search jobs..."
          className="flex-1 min-w-48 max-w-sm"
        />
        <div className="flex gap-2">
          {['all', 'active', 'closed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all border',
                statusFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              {s === 'all' ? 'All Jobs' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Job</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Applications</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Deadline</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4"><div className="h-4 bg-slate-100 rounded w-2/3 mb-1" /><div className="h-3 bg-slate-50 rounded w-1/3" /></td>
                  <td className="px-4 py-4 hidden sm:table-cell"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
                  <td className="px-4 py-4 hidden md:table-cell"><div className="h-4 bg-slate-100 rounded w-12" /></td>
                  <td className="px-4 py-4 hidden lg:table-cell"><div className="h-4 bg-slate-100 rounded w-20" /></td>
                  <td className="px-4 py-4"><div className="h-8 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No jobs found</td></tr>
            ) : filtered.map(job => (
              <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4">
                  <button onClick={() => navigate(`/company/jobs/${job.id}/edit`)} className="text-left hover:text-blue-700 transition-colors">
                    <p className="font-semibold text-slate-900 text-sm">{job.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</span>
                      {job.district && <><span className="text-xs text-slate-400">·</span><span className="text-xs text-slate-400">{job.district}</span></>}
                    </div>
                  </button>
                </td>
                <td className="px-4 py-4 hidden sm:table-cell">
                  {job.isActive
                    ? <Badge variant="success" size="xs" dot>Active</Badge>
                    : <Badge variant="default" size="xs" dot>Closed</Badge>
                  }
                </td>
                <td className="px-4 py-4 hidden md:table-cell">
                  <span className="font-semibold text-slate-900">{job._count?.applications ?? 0}</span>
                  <span className="text-xs text-slate-400 ml-1">total</span>
                </td>
                <td className="px-4 py-4 text-xs text-slate-500 hidden lg:table-cell">
                  {job.deadline ? formatDate(job.deadline) : '—'}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/company/applicants?job=${job.id}`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="View applicants"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => navigate(`/company/jobs/${job.id}/edit`)}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit job"
                    >
                      <Edit2 size={15} />
                    </button>
                    <Dropdown
                      trigger={
                        <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                          <MoreVertical size={15} />
                        </button>
                      }
                      align="right"
                    >
                      <DropdownItem icon={Eye} onClick={() => toggleMutation.mutate(job.id)}>
                        {job.isActive ? 'Close Job' : 'Reactivate'}
                      </DropdownItem>
                      <DropdownSeparator />
                      <DropdownItem
                        icon={Trash2}
                        danger
                        onClick={() => {
                          if (confirm(`Delete "${job.title}"? This cannot be undone.`)) {
                            deleteMutation.mutate(job.id)
                          }
                        }}
                      >
                        Delete Job
                      </DropdownItem>
                    </Dropdown>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
