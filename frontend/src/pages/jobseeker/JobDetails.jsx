import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MapPin, Clock, Briefcase, Users, Building2,
  Bookmark, BookmarkCheck, Share2, ArrowLeft, CheckCircle2, ShieldCheck, ExternalLink
} from 'lucide-react'
import { Button, Badge, VerifiedBadge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { jobService } from '@/services/jobService'
import { applicationService } from '@/services/applicationService'
import useAuthStore from '@/store/authStore'
import { normalizeRole } from '@/utils/roles'
import { formatDate } from '@/utils/formatters'

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto animate-pulse">
      <div className="h-5 bg-slate-100 rounded w-24 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex gap-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 shrink-0" />
              <div className="flex-1">
                <div className="h-6 bg-slate-100 rounded w-2/3 mb-2" />
                <div className="h-4 bg-slate-50 rounded w-1/3 mb-4" />
                <div className="flex gap-2">
                  <div className="h-6 bg-slate-100 rounded-full w-20" />
                  <div className="h-6 bg-slate-50 rounded w-28" />
                </div>
              </div>
            </div>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="h-5 bg-slate-100 rounded w-1/4 mb-4" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => <div key={j} className="h-3 bg-slate-50 rounded" />)}
              </div>
            </div>
          ))}
        </div>
        <div className="h-80 bg-white border border-slate-200 rounded-xl" />
      </div>
    </div>
  )
}

export default function JobDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isJobSeeker = normalizeRole(user?.role) === 'job_seeker'

  const { data: jobData, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJobById(id),
    staleTime: 1000 * 60 * 5,
  })

  const { data: savedData } = useQuery({
    queryKey: ['saved-jobs', 'ids'],
    queryFn: () => applicationService.getSavedJobs().then(res => new Set((res?.savedJobs || res || []).map(s => s.jobId || s.id))),
    enabled: isJobSeeker,
    staleTime: 1000 * 60 * 5,
  })
  const isSaved = savedData?.has(id) || false

  const saveMutation = useMutation({
    mutationFn: () => applicationService.saveJob(id),
    onSuccess: () => queryClient.invalidateQueries(['saved-jobs']),
  })
  const unsaveMutation = useMutation({
    mutationFn: () => applicationService.unsaveJob(id),
    onSuccess: () => queryClient.invalidateQueries(['saved-jobs']),
  })

  const toggleSave = () => {
    if (!isJobSeeker) { navigate('/login'); return }
    isSaved ? unsaveMutation.mutate() : saveMutation.mutate()
  }

  if (isLoading) return <DetailSkeleton />
  if (isError) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Failed to load job details</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const job = jobData?.job || jobData
  if (!job) return null

  const company = job.company || {}
  const initials = company.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'
  const salary = job.salaryMin
    ? `NPR ${job.salaryMin.toLocaleString()}${job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : '+'}`
    : 'Negotiable'

  const requirementLines = (job.requirements || '').split('\n').filter(Boolean)
  const benefitLines = (job.benefits || '').split('\n').filter(Boolean)

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Jobs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-5">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-slate-700 font-medium">{company.name}</span>
                      {company.isVerified && <VerifiedBadge />}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={toggleSave}
                      className={cn(
                        'p-2 rounded-lg border transition-colors',
                        isSaved
                          ? 'border-blue-200 text-blue-600 bg-blue-50'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                    <button className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <Badge variant="primary">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</Badge>
                  {job.district && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} /> {job.district}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Clock size={14} /> Deadline: {formatDate(job.deadline)}
                    </span>
                  )}
                  {job.openings && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-500">
                      <Users size={14} /> {job.openings} opening{job.openings > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Description</h2>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{job.description}</p>
          </div>

          {/* Requirements */}
          {requirementLines.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements</h2>
              <ul className="space-y-3">
                {requirementLines.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0" />
                    {r.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {benefitLines.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Benefits & Perks</h2>
              <div className="grid grid-cols-2 gap-3">
                {benefitLines.map((b, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                    </div>
                    {b.replace(/^[-•*]\s*/, '')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
            <div className="text-center mb-5">
              <p className="text-2xl font-bold text-slate-900">{salary}</p>
              <p className="text-xs text-slate-500 mt-1">Monthly gross salary</p>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="mb-3"
              onClick={() => navigate(`apply`)}
            >
              Apply Now
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              icon={isSaved ? BookmarkCheck : Bookmark}
              onClick={toggleSave}
            >
              {isSaved ? 'Saved' : 'Save Job'}
            </Button>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
              {[
                { icon: Briefcase, label: 'Job Type', value: JOB_TYPE_LABELS[job.jobType] || job.jobType },
                job.district && { icon: MapPin, label: 'Location', value: job.district },
                job.experience && { icon: Users, label: 'Experience', value: job.experience },
                job.deadline && { icon: Clock, label: 'Deadline', value: formatDate(job.deadline) },
                job.openings && { icon: Building2, label: 'Openings', value: `${job.openings} position${job.openings > 1 ? 's' : ''}` },
              ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Icon size={14} /> {label}
                  </span>
                  <span className="font-medium text-slate-900 text-right max-w-28 text-xs">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">About the Company</h3>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 mb-3">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 text-sm">{company.name}</p>
                {company.isVerified && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck size={11} className="text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">Verified Company</span>
                  </div>
                )}
              </div>
            </div>
            {company.description && (
              <p className="text-xs text-slate-500 leading-relaxed">{company.description}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
