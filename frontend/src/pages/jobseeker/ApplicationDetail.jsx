import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Briefcase, CheckCircle2, Download } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { formatDate, formatRelativeTime } from '@/utils/formatters'
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

const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

const STATUS_SEQUENCE = ['PENDING', 'REVIEWING', 'SHORTLISTED', 'HIRED']

function buildTimeline(application) {
  const status = application.status
  const createdAt = application.createdAt
  const updatedAt = application.updatedAt

  if (status === 'WITHDRAWN' || status === 'REJECTED') {
    return [
      { label: 'Applied', date: createdAt, done: true },
      { label: STATUS_CONFIG[status]?.label || status, date: updatedAt, done: true, isFinal: true },
    ]
  }

  const idx = STATUS_SEQUENCE.indexOf(status)
  return STATUS_SEQUENCE.map((s, i) => ({
    label: STATUS_CONFIG[s]?.label || s,
    date: i === 0 ? createdAt : i === idx ? updatedAt : null,
    done: i <= idx,
    current: i === idx,
  }))
}

export default function ApplicationDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationService.getApplicationById(id),
    staleTime: 1000 * 60 * 2,
  })

  const withdrawMutation = useMutation({
    mutationFn: () => applicationService.withdrawApplication(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['application', id])
      queryClient.invalidateQueries(['applications', 'me'])
    },
  })

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse">
        <div className="h-5 bg-slate-100 rounded w-40 mb-6" />
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100" />
            <div className="flex-1">
              <div className="h-5 bg-slate-100 rounded w-1/2 mb-2" />
              <div className="h-4 bg-slate-50 rounded w-1/3" />
            </div>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="h-60 bg-white border border-slate-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-40 bg-white border border-slate-200 rounded-xl" />
            <div className="h-24 bg-white border border-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Application not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const application = data?.application || data
  const job = application?.job
  const company = job?.company
  const s = STATUS_CONFIG[application?.status] || STATUS_CONFIG.PENDING
  const timeline = buildTimeline(application)
  const canWithdraw = !['WITHDRAWN', 'HIRED', 'REJECTED'].includes(application?.status)
  const salary = job?.salaryMin
    ? `NPR ${job.salaryMin.toLocaleString()}${job.salaryMax ? ` – ${job.salaryMax.toLocaleString()}` : '+'}`
    : 'Negotiable'

  const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Applications
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          {company?.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{job?.title}</h1>
            <p className="text-slate-600 mt-1">{company?.name}{job?.district ? ` · ${job.district}` : ''}</p>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', s.class)}>{s.label}</span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={12} /> Applied {formatRelativeTime(application?.createdAt)}
              </span>
              {job?.jobType && (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Briefcase size={12} /> {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {application?.status === 'SHORTLISTED' && (
        <Alert type="success" title="You've been shortlisted!" message="The company has shortlisted your application. They may contact you soon for next steps." className="mb-6" dismissible />
      )}
      {application?.status === 'HIRED' && (
        <Alert type="success" title="Congratulations! You're hired!" message="The company has selected you for this position. Check your email for further details." className="mb-6" dismissible />
      )}
      {application?.notes && (
        <Alert type="info" title="Note from employer" message={application.notes} className="mb-6" />
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-5">Application Timeline</h2>
          <div className="space-y-4">
            {timeline.map(({ label, date, done, current, isFinal }, i) => (
              <div key={label} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                    done && !isFinal ? 'bg-emerald-500' : current || isFinal ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-200'
                  )}>
                    {done && !isFinal ? (
                      <CheckCircle2 size={12} className="text-white" />
                    ) : current || isFinal ? (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-400" />
                    )}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={cn('w-0.5 flex-1 mt-1', done ? 'bg-emerald-200' : 'bg-slate-100')} style={{ minHeight: 20 }} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={cn('text-sm font-medium', done || current ? 'text-slate-900' : 'text-slate-400')}>
                    {label}
                    {current && <span className="ml-2 text-xs text-blue-600 font-normal">← Current</span>}
                  </p>
                  {date && <p className="text-xs text-slate-500 mt-0.5">{formatDate(date)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Application Details</h2>
            <div className="space-y-3">
              {[
                { label: 'Applied On', value: formatDate(application?.createdAt) },
                job?.jobType && { label: 'Job Type', value: JOB_TYPE_LABELS[job.jobType] || job.jobType },
                { label: 'Salary', value: salary },
                job?.district && { label: 'Location', value: job.district },
                job?.deadline && { label: 'Deadline', value: formatDate(job.deadline) },
              ].filter(Boolean).map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {application?.resumeUrl && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Submitted Documents</h2>
              <a
                href={application.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Download size={14} className="text-blue-600" />
                </div>
                <span className="text-sm text-slate-700 flex-1 truncate">
                  {application.resumeUrl.split('/').pop() || 'Resume'}
                </span>
                <span className="text-xs text-blue-600">View</span>
              </a>
            </div>
          )}

          {canWithdraw && (
            <Button
              variant="outline-danger"
              size="sm"
              fullWidth
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? 'Withdrawing...' : 'Withdraw Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
