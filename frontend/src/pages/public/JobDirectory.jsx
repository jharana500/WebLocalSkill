import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Bookmark, Clock, Briefcase, SlidersHorizontal } from 'lucide-react'
import { Button, Badge, VerifiedBadge, Pagination, EmptyState } from '@/components/ui'
import { SearchBar } from '@/components/ui/SearchBar'
import { useDebounce } from '@/hooks/useDebounce'
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES, NEPAL_DISTRICTS, SALARY_RANGES } from '@/utils/constants'
import { jobService } from '@/services/jobService'
import { formatRelativeTime } from '@/utils/formatters'

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

function FilterPanel({ filters, onChange, onClear }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 text-sm">Filters</h3>
        <button onClick={onClear} className="text-xs text-blue-600 hover:underline">Clear all</button>
      </div>

      {[
        { label: 'Job Type', key: 'jobType', options: JOB_TYPES },
        { label: 'Experience', key: 'experience', options: EXPERIENCE_LEVELS },
      ].map(({ label, key, options }) => (
        <div key={key}>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">{label}</p>
          <div className="space-y-2">
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters[key] === opt.value}
                  onChange={(e) => onChange(key, e.target.checked ? opt.value : '')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                <span className="text-sm text-slate-600 group-hover:text-slate-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Location</p>
        <select
          value={filters.district || ''}
          onChange={(e) => onChange('district', e.target.value)}
          className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">All Districts</option>
          {NEPAL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    </div>
  )
}

function JobCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
          <div className="h-3 bg-slate-50 rounded w-1/3 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-slate-100 rounded-full w-16" />
            <div className="h-5 bg-slate-50 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

function JobListItem({ job }) {
  const navigate = useNavigate()
  const company = job.company || {}
  const initials = company.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'
  const salary = job.salaryMin
    ? `NPR ${(job.salaryMin / 1000).toFixed(0)}K${job.salaryMax ? `–${(job.salaryMax / 1000).toFixed(0)}K` : '+'}`
    : null

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{job.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-600">{company.name}</span>
                {company.isVerified && <VerifiedBadge size="xs" />}
              </div>
            </div>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
            >
              <Bookmark size={16} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <Badge variant="primary" size="sm">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</Badge>
            {job.district && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin size={11} /> {job.district}
              </span>
            )}
            {job.experience && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Briefcase size={11} /> {job.experience}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock size={11} /> {formatRelativeTime(job.createdAt)}
            </span>
          </div>
        </div>
        {salary && (
          <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
            <span className="text-sm font-semibold text-slate-900">{salary}</span>
            <Button variant="outline" size="sm" className="group-hover:border-blue-300 group-hover:text-blue-600">
              Apply Now
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function JobDirectory() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ jobType: '', experience: '', district: '' })
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const debouncedSearch = useDebounce(search, 400)

  const queryParams = {
    page,
    q: debouncedSearch || undefined,
    jobType: filters.jobType || undefined,
    experience: filters.experience || undefined,
    district: filters.district || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', 'public', queryParams],
    queryFn: () => jobService.getJobs(queryParams),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  })

  const jobs = data?.jobs || []
  const pagination = data?.pagination || { total: 0, totalPages: 1 }

  const updateFilter = (key, value) => { setFilters(f => ({ ...f, [key]: value })); setPage(1) }
  const clearFilters = () => { setFilters({ jobType: '', experience: '', district: '' }); setPage(1) }
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Browse All Jobs</h1>
          <p className="text-slate-500 text-sm mb-6">
            {isLoading ? 'Loading...' : `${pagination.total.toLocaleString()} jobs from verified companies across Nepal`}
          </p>
          <div className="flex gap-3">
            <SearchBar
              value={search}
              onChange={(val) => { setSearch(val); setPage(1) }}
              placeholder="Search job title, skills, company..."
              className="flex-1 max-w-xl"
              size="lg"
            />
            <Button
              variant={activeFilterCount > 0 ? 'outline-primary' : 'outline'}
              icon={SlidersHorizontal}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 flex gap-8">
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
            <FilterPanel filters={filters} onChange={updateFilter} onClear={clearFilters} />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {showFilters && (
            <div className="lg:hidden bg-white border border-slate-200 rounded-xl p-5 mb-5">
              <FilterPanel filters={filters} onChange={updateFilter} onClear={clearFilters} />
            </div>
          )}

          <div className="flex items-center justify-between mb-5">
            <p className="text-sm text-slate-600">
              {isLoading ? '...' : <>Showing <strong>{pagination.total}</strong> jobs</>}
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)}
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs found"
              description="Try adjusting your search or clearing filters"
              action={{ label: 'Clear filters', onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="space-y-3">
                {jobs.map(job => <JobListItem key={job.id} job={job} />)}
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
