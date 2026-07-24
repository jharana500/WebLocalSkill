import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, ArrowLeft, Briefcase, Save } from 'lucide-react'
import { Button, Alert, Badge } from '@/components/ui'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES, NEPAL_DISTRICTS } from '@/utils/constants'
import { cn } from '@/utils/cn'
import { jobService } from '@/services/jobService'
import useAuthStore from '@/store/authStore'

const schema = z.object({
  title: z.string().min(5, 'Job title must be at least 5 characters'),
  category: z.string().min(1, 'Select a category'),
  type: z.string().min(1, 'Select a job type'),
  experience: z.string().min(1, 'Select experience level'),
  location: z.string().min(1, 'Select a location'),
  salaryMin: z.coerce.number().optional(),
  salaryMax: z.coerce.number().optional(),
  description: z.string().min(100, 'Description must be at least 100 characters'),
  requirements: z.string().min(50, 'Requirements must be at least 50 characters'),
  benefits: z.string().optional(),
  deadline: z.string().min(1, 'Set an application deadline'),
  openings: z.coerce.number().min(1, 'At least 1 opening required'),
})

const steps = ['Job Details', 'Requirements', 'Compensation', 'Review']

export default function PostJob() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, refreshCurrentUser } = useAuthStore()
  const isVerified = !!user?.company?.isVerified
  const [step, setStep] = useState(0)
  const [postedJob, setPostedJob] = useState(null)
  const [publishedNow, setPublishedNow] = useState(false)

  // The cached auth user can go stale if the company was verified earlier in
  // this session (e.g. by an admin) — refresh so the publish gate reflects
  // the company's actual current verification status, not a stale login.
  useEffect(() => {
    refreshCurrentUser().catch(() => {})
  }, [refreshCurrentUser])

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { openings: 1 },
  })

  const values = watch()

  const buildPayload = (data, status) => ({
    title: data.title,
    category: data.category,
    jobType: data.type,
    experience: data.experience,
    district: data.location,
    salaryMin: data.salaryMin || undefined,
    salaryMax: data.salaryMax || undefined,
    description: data.description,
    requirements: data.requirements,
    benefits: data.benefits || undefined,
    deadline: data.deadline,
    openings: data.openings,
    status,
  })

  const createMutation = useMutation({
    mutationFn: ({ data, status }) => jobService.createJob(buildPayload(data, status)),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries(['company', 'jobs'])
      setPublishedNow(variables.status === 'ACTIVE')
      setPostedJob(res?.job || res)
    },
  })

  const handlePost = (data) => createMutation.mutate({ data, status: isVerified ? 'ACTIVE' : 'DRAFT' })
  const handleSaveDraft = handleSubmit((data) => createMutation.mutate({ data, status: 'DRAFT' }))

  if (postedJob) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 animate-scale-in">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">
          {publishedNow ? 'Job Posted Successfully!' : 'Draft Saved'}
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
          {publishedNow
            ? 'Your job posting is now live and will appear in search results for qualified candidates.'
            : 'Your job has been saved as a draft. You can publish it once your company is verified.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={() => navigate('/company/jobs')}>View My Jobs</Button>
          <Button variant="outline" onClick={() => { setPostedJob(null); setStep(0) }}>Post Another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Post a New Job</h1>
          <p className="text-slate-500 text-sm mt-0.5">Reach qualified candidates directly</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
              i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
            )}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={cn('text-xs font-medium hidden sm:block', i === step ? 'text-blue-700' : 'text-slate-400')}>{s}</span>
            {i < steps.length - 1 && <div className={cn('flex-1 h-0.5', i < step ? 'bg-emerald-200' : 'bg-slate-200')} />}
          </div>
        ))}
      </div>

      {createMutation.isError && (
        <Alert type="error" message={createMutation.error?.message || 'Failed to post job. Please try again.'} className="mb-4" />
      )}

      <form onSubmit={handleSubmit(handlePost)}>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Job Details</h2>
              <Input label="Job Title" placeholder="e.g. Senior React Developer" required error={errors.title?.message} {...register('title')} />
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label="Category" required error={errors.category?.message} {...register('category')} placeholder="Select category">
                  {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
                <Select label="Job Type" required error={errors.type?.message} {...register('type')} placeholder="Select type">
                  {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Select label="Experience Level" required error={errors.experience?.message} {...register('experience')} placeholder="Select level">
                  {EXPERIENCE_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </Select>
                <Select label="Location" required error={errors.location?.message} {...register('location')} placeholder="Select district">
                  <option value="Remote">Remote</option>
                  {NEPAL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </Select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Application Deadline" type="date" required error={errors.deadline?.message} {...register('deadline')} />
                <Input label="Number of Openings" type="number" min={1} defaultValue={1} error={errors.openings?.message} {...register('openings')} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Job Description & Requirements</h2>
              <Textarea
                label="Job Description"
                placeholder="Describe the role, team, and what makes this opportunity exciting..."
                rows={6}
                required
                error={errors.description?.message}
                {...register('description')}
              />
              <Textarea
                label="Requirements"
                placeholder="List the key qualifications, skills, and experience required..."
                rows={5}
                required
                error={errors.requirements?.message}
                {...register('requirements')}
              />
              <Textarea
                label="Benefits & Perks (optional)"
                placeholder="Health insurance, flexible hours, remote work, learning budget..."
                rows={3}
                {...register('benefits')}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-900">Compensation</h2>
              <Alert type="info" message="Displaying a salary range increases applications by 40%. Candidates prefer transparency." />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Minimum Salary (NPR/month)" type="number" placeholder="e.g. 60000" {...register('salaryMin')} />
                <Input label="Maximum Salary (NPR/month)" type="number" placeholder="e.g. 90000" {...register('salaryMax')} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Review & Post</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Briefcase size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{values.title || 'Job Title'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {values.type && <Badge variant="primary" size="xs">{values.type}</Badge>}
                      {values.location && <span className="text-xs text-slate-500">{values.location}</span>}
                    </div>
                  </div>
                </div>
                {[
                  ['Category', values.category],
                  ['Experience', values.experience],
                  ['Deadline', values.deadline],
                  ['Openings', values.openings],
                ].map(([k, v]) => v && (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-900">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === steps.length - 1 && !isVerified && (
          <Alert
            type="warning"
            title="Verification required to publish"
            message="Your company isn't verified yet, so this job will be saved as a draft. Complete verification to publish it live."
            className="mb-5"
          />
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} type="button">← Previous</Button>
          ) : <div />}
          {step < steps.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(s => s + 1)} type="button">Continue →</Button>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                type="button"
                icon={Save}
                onClick={handleSaveDraft}
                disabled={createMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={CheckCircle2}
                disabled={createMutation.isPending || !isVerified}
                title={!isVerified ? 'Your company must be verified before publishing jobs' : undefined}
              >
                {createMutation.isPending ? 'Posting...' : 'Post Job Live'}
              </Button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
