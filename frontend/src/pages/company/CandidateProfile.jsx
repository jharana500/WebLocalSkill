import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, MapPin, Download, CheckCircle2, XCircle, Briefcase, GraduationCap } from 'lucide-react'
import { Button, Badge, Avatar } from '@/components/ui'
import { Select } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { applicationService } from '@/services/applicationService'
import { formatDate, formatRelativeTime } from '@/utils/formatters'

const STATUS_OPTIONS = ['REVIEWING', 'SHORTLISTED', 'HIRED', 'REJECTED']
const STATUS_LABELS = {
  PENDING: 'Applied', REVIEWING: 'Under Review', SHORTLISTED: 'Shortlisted',
  HIRED: 'Hired', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}
const STATUS_STYLES = {
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEWING: 'bg-amber-50 text-amber-700 border-amber-200',
  SHORTLISTED: 'bg-purple-50 text-purple-700 border-purple-200',
  HIRED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  WITHDRAWN: 'bg-slate-50 text-slate-500 border-slate-200',
}
const JOB_TYPE_LABELS = {
  FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract',
  INTERNSHIP: 'Internship', REMOTE: 'Remote', FREELANCE: 'Freelance',
}

export default function CandidateProfile() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationService.getApplicationById(id),
    staleTime: 1000 * 60 * 2,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }) => applicationService.updateApplicationStatus(id, status, notes),
    onSuccess: () => queryClient.invalidateQueries(['application', id]),
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-5 bg-slate-100 rounded w-32 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-48" />
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-40" />
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 h-80" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Application not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const application = data?.application || data
  const profile = application?.user?.profile
  const user = application?.user
  const job = application?.job

  const name = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user?.email
    : user?.email || 'Unknown'

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Applicants
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Candidate Info */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-5">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={name} className="w-16 h-16 rounded-full object-cover shrink-0" />
              ) : (
                <Avatar name={name} size="2xl" />
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-900">{name}</h1>
                {profile?.bio && <p className="text-slate-600 mt-0.5 text-sm">{profile.bio}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-slate-500">
                  {profile?.district && <span className="flex items-center gap-1.5"><MapPin size={14} /> {profile.district}</span>}
                  {user?.email && <span className="flex items-center gap-1.5"><Mail size={14} /> {user.email}</span>}
                  {profile?.phone && <span className="flex items-center gap-1.5"><Phone size={14} /> {profile.phone}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', STATUS_STYLES[application?.status] || STATUS_STYLES.PENDING)}>
                    {STATUS_LABELS[application?.status] || application?.status}
                  </span>
                </div>
              </div>
            </div>
            {profile?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {profile.skills.map(s => (
                  <span key={s} className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>

          {/* Experience */}
          {profile?.experience?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-blue-600" /> Work Experience
              </h2>
              <div className="space-y-4">
                {profile.experience.map((exp, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1 bg-blue-100 rounded-full shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{exp.title}</p>
                      <p className="text-xs text-slate-500">
                        {exp.company}
                        {exp.startDate && ` · ${formatDate(exp.startDate)}${exp.endDate ? ` – ${formatDate(exp.endDate)}` : ' – Present'}`}
                      </p>
                      {exp.description && <p className="text-xs text-slate-500 mt-1">{exp.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {profile?.education?.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <GraduationCap size={16} className="text-purple-600" /> Education
              </h2>
              <div className="space-y-3">
                {profile.education.map((edu, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-1 bg-purple-100 rounded-full shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                      <p className="text-xs text-slate-500">
                        {edu.institution}
                        {edu.startYear && ` · ${edu.startYear}${edu.endYear ? ` – ${edu.endYear}` : ''}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 sticky top-24">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Update Status</h3>
            <Select
              placeholder="Change status"
              className="mb-4"
              defaultValue={application?.status}
              onChange={(e) => updateStatusMutation.mutate({ status: e.target.value })}
              disabled={updateStatusMutation.isPending || ['WITHDRAWN'].includes(application?.status)}
            >
              {STATUS_OPTIONS.map(v => <option key={v} value={v}>{STATUS_LABELS[v]}</option>)}
            </Select>

            <div className="space-y-2 mb-5">
              {!['SHORTLISTED', 'HIRED', 'REJECTED', 'WITHDRAWN'].includes(application?.status) && (
                <Button
                  variant="success"
                  fullWidth
                  icon={CheckCircle2}
                  onClick={() => updateStatusMutation.mutate({ status: 'SHORTLISTED' })}
                  disabled={updateStatusMutation.isPending}
                >
                  Shortlist Candidate
                </Button>
              )}
              {profile?.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" fullWidth icon={Download}>Download Resume</Button>
                </a>
              )}
            </div>

            {!['REJECTED', 'WITHDRAWN'].includes(application?.status) && (
              <Button
                variant="outline-danger"
                fullWidth
                size="sm"
                icon={XCircle}
                onClick={() => updateStatusMutation.mutate({ status: 'REJECTED' })}
                disabled={updateStatusMutation.isPending}
              >
                Reject Candidate
              </Button>
            )}

            <div className="mt-5 pt-5 border-t border-slate-100 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied For</p>
              <p className="text-sm font-medium text-slate-900">{job?.title}</p>
              <p className="text-xs text-slate-500">Applied {formatRelativeTime(application?.createdAt)}</p>
              {job?.jobType && <p className="text-xs text-slate-500">{JOB_TYPE_LABELS[job.jobType] || job.jobType}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
