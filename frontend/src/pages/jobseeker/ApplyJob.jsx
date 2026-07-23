import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, FileText, User, Briefcase, ChevronRight } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Textarea } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { jobService } from '@/services/jobService'
import { userService } from '@/services/userService'
import { applicationService } from '@/services/applicationService'

const steps = ['Review Info', 'Resume', 'Cover Letter', 'Submit']

export default function ApplyJob() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [step, setStep] = useState(0)
  const [coverLetter, setCoverLetter] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [applyError, setApplyError] = useState(null)

  const { data: jobData, isLoading: loadingJob } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJobById(id),
    staleTime: 1000 * 60 * 5,
  })

  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => userService.getProfile(),
    staleTime: 1000 * 60 * 5,
  })

  const applyMutation = useMutation({
    mutationFn: () => applicationService.applyToJob(id, { coverLetter: coverLetter || undefined }),
    onSuccess: () => setSubmitted(true),
    onError: (err) => setApplyError(err?.message || err?.data?.message || 'Failed to submit application'),
  })

  const job = jobData?.job || jobData
  const profile = profileData?.profile || profileData
  const isLoading = loadingJob || loadingProfile

  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : ''
  const salary = job?.salaryMin
    ? `NPR ${(job.salaryMin / 1000).toFixed(0)}K${job.salaryMax ? `–${(job.salaryMax / 1000).toFixed(0)}K` : '+'}`
    : null

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1)
    } else {
      setApplyError(null)
      applyMutation.mutate()
    }
  }

  if (submitted && job) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-scale-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Application Submitted!</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          Your application for <strong>{job.title}</strong> at <strong>{job.company?.name}</strong> has been sent directly to the hiring team.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-left">
          <p className="text-sm font-semibold text-blue-900 mb-1">What happens next?</p>
          <ul className="space-y-1.5 text-xs text-blue-700">
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> The company will review your application within 3–5 business days</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> You'll be notified when your status changes</li>
            <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Track your application in the Applications section</li>
          </ul>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={() => navigate('/dashboard/applications')}>View Applications</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/find-jobs')}>Find More Jobs</Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-5 bg-slate-100 rounded w-24" />
        <div className="h-16 bg-slate-100 rounded-xl" />
        <div className="flex gap-2 mb-8">{steps.map((_, i) => <div key={i} className="flex-1 h-7 bg-slate-100 rounded-full" />)}</div>
        <div className="h-64 bg-white border border-slate-200 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <button
        onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> {step > 0 ? 'Previous step' : 'Back to job'}
      </button>

      {/* Job Preview */}
      {job && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-4">
          {job.company?.logoUrl ? (
            <img src={job.company.logoUrl} alt={job.company.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
              {job.company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '??'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-900 truncate">{job.title}</p>
            <p className="text-sm text-slate-600">{job.company?.name}{job.district ? ` · ${job.district}` : ''}</p>
          </div>
          {salary && <div className="ml-auto text-sm font-semibold text-slate-900 shrink-0">{salary}</div>}
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
              i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            )}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block', i === step ? 'text-blue-700' : 'text-slate-400')}>
              {s}
            </span>
            {i < steps.length - 1 && <div className={cn('flex-1 h-0.5', i < step ? 'bg-emerald-200' : 'bg-slate-200')} />}
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Review Your Information</h2>
            <p className="text-sm text-slate-500">This information comes from your profile and will be sent to the employer.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: 'Full Name', value: fullName || 'Not set' },
                { label: 'Email', value: profile?.email || 'Not set' },
                { label: 'Phone', value: profile?.phone || 'Not set' },
                { label: 'Location', value: profile?.district || 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-sm font-medium text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            {(!profile?.firstName || !profile?.phone) && (
              <Alert type="warning" message="Some profile fields are missing. Update your profile to improve your application." />
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Resume</h2>
            {profile?.resumeUrl ? (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <FileText size={18} className="text-emerald-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">Resume on file</p>
                  <p className="text-xs text-slate-500 truncate">{profile.resumeUrl.split('/').pop()}</p>
                </div>
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 font-medium">No resume uploaded</p>
                <p className="text-xs text-amber-600 mt-1">
                  Upload a resume from your profile to include it with this application.
                </p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/dashboard/resume')}>
                  Upload Resume
                </Button>
              </div>
            )}
            <Alert type="info" message="Your resume will be shared with the hiring team along with your application." />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Write a Cover Letter</h2>
            <Alert type="info" message="A personalized cover letter increases your chance of getting shortlisted by 3x." />
            <Textarea
              label="Cover Letter (optional)"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder={`Dear Hiring Team,\n\nI am excited to apply for the ${job?.title || 'position'} at ${job?.company?.name || 'your company'}...`}
              rows={8}
              hint="Tip: Mention specific projects or achievements relevant to this role"
            />
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => { setCoverLetter(''); setStep(s => s + 1) }}
            >
              Skip cover letter
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-900">Review & Submit</h2>
            <div className="space-y-3">
              {[
                { icon: User, label: 'Personal Info', value: fullName || 'Profile info' },
                { icon: FileText, label: 'Resume', value: profile?.resumeUrl ? profile.resumeUrl.split('/').pop() : 'No resume attached' },
                { icon: Briefcase, label: 'Cover Letter', value: coverLetter ? 'Included' : 'Skipped' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Icon size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="text-sm text-slate-900 truncate">{value}</p>
                  </div>
                  <CheckCircle2 size={16} className="text-emerald-500" />
                </div>
              ))}
            </div>
            {job && (
              <Alert type="info" message={`Your application goes directly to the hiring team at ${job.company?.name || 'the company'}. No recruiters, no middlemen.`} />
            )}
            {applyError && <Alert type="error" message={applyError} />}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6">
        <Button
          variant="primary"
          size="lg"
          iconRight={step < steps.length - 1 ? ChevronRight : CheckCircle2}
          onClick={handleNext}
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? 'Submitting...' : step < steps.length - 1 ? 'Continue' : 'Submit Application'}
        </Button>
      </div>
    </div>
  )
}
