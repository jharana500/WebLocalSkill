import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkX, MapPin, Clock, Briefcase } from 'lucide-react'
import { Badge, VerifiedBadge, EmptyState, Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { applicationService } from '@/services/applicationService'
import { formatRelativeTime, formatDate } from '@/utils/formatters'

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

export default function SavedJobs() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['saved-jobs'],
    queryFn: () => applicationService.getSavedJobs(),
    staleTime: 1000 * 60 * 2,
  })

  const unsaveMutation = useMutation({
    mutationFn: (jobId) => applicationService.unsaveJob(jobId),
    onSuccess: () => queryClient.invalidateQueries(['saved-jobs']),
  })

  const savedJobs = data?.savedJobs || data || []

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in space-y-3">
        <div className="h-8 bg-slate-100 rounded w-40 animate-pulse mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-50 rounded w-1/4 mb-3" />
                <div className="flex gap-2">
                  <div className="h-5 bg-slate-100 rounded-full w-16" />
                  <div className="h-5 bg-slate-50 rounded w-20" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (savedJobs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={Bookmark}
          title="No saved jobs yet"
          description="Browse jobs and click the bookmark icon to save jobs you're interested in"
          action={{ label: 'Browse Jobs', onClick: () => navigate('/dashboard/find-jobs') }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Saved Jobs</h1>
          <p className="text-slate-500 text-sm mt-1">{savedJobs.length} jobs saved</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/dashboard/find-jobs')}>Browse More Jobs</Button>
      </div>

      <div className="space-y-3">
        {savedJobs.map(saved => {
          const job = saved.job || saved
          const company = job.company || {}
          const initials = company.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'
          const salary = job.salaryMin
            ? `NPR ${(job.salaryMin / 1000).toFixed(0)}K${job.salaryMax ? `–${(job.salaryMax / 1000).toFixed(0)}K` : '+'}`
            : null

          return (
            <div key={saved.id || job.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow group">
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
                      <button
                        onClick={() => navigate(`/dashboard/jobs/${job.id}`)}
                        className="font-semibold text-slate-900 hover:text-blue-700 transition-colors text-left"
                      >
                        {job.title}
                      </button>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-600">{company.name}</span>
                        {company.isVerified && <VerifiedBadge size="xs" />}
                      </div>
                    </div>
                    <button
                      onClick={() => unsaveMutation.mutate(job.id)}
                      disabled={unsaveMutation.isPending}
                      className="p-2 rounded-lg text-blue-600 bg-blue-50 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      title="Remove from saved"
                    >
                      <BookmarkX size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {job.jobType && (
                      <Badge variant="primary" size="sm">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</Badge>
                    )}
                    {job.district && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} /> {job.district}
                      </span>
                    )}
                    {job.createdAt && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={11} /> {formatRelativeTime(job.createdAt)}
                      </span>
                    )}
                    {job.deadline && (
                      <span className="text-xs text-amber-600 font-medium">Deadline: {formatDate(job.deadline)}</span>
                    )}
                  </div>
                </div>
                <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                  {salary && <span className="text-sm font-bold text-slate-900">{salary}</span>}
                  <Button variant="primary" size="sm" onClick={() => navigate(`/dashboard/jobs/${job.id}/apply`)}>
                    Apply Now
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
