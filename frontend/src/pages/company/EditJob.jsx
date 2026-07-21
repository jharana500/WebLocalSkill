import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Input, Textarea, Select } from '@/components/ui/Input'
import { JOB_TYPES, EXPERIENCE_LEVELS, JOB_CATEGORIES, NEPAL_DISTRICTS } from '@/utils/constants'
import { jobService } from '@/services/jobService'
import { formatDate } from '@/utils/formatters'

export default function EditJob() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobService.getJobById(id),
    staleTime: 1000 * 60 * 5,
  })

  const job = data?.job || data

  useEffect(() => {
    if (job && !form) {
      setForm({
        title: job.title || '',
        category: job.category || '',
        jobType: job.jobType || '',
        experience: job.experience || '',
        district: job.district || '',
        salaryMin: job.salaryMin || '',
        salaryMax: job.salaryMax || '',
        description: job.description || '',
        requirements: job.requirements || '',
        benefits: job.benefits || '',
        deadline: job.deadline ? job.deadline.slice(0, 10) : '',
        openings: job.openings || 1,
      })
    }
  }, [job])

  const updateMutation = useMutation({
    mutationFn: (data) => jobService.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['job', id])
      queryClient.invalidateQueries(['company', 'jobs'])
      setSaveError(null)
    },
    onError: (err) => setSaveError(err?.message || 'Failed to save changes'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => jobService.deleteJob(id),
    onSuccess: () => navigate('/company/jobs'),
  })

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  if (isLoading || !form) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-5">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Failed to load job</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
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
          <h1 className="text-2xl font-bold text-slate-900">Edit Job</h1>
          <p className="text-slate-500 text-sm">{job?.title}</p>
        </div>
      </div>

      {updateMutation.isSuccess && (
        <Alert type="success" title="Job updated!" message="Your job listing has been saved." className="mb-5" dismissible />
      )}
      {saveError && <Alert type="error" message={saveError} className="mb-5" />}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
        <Input label="Job Title" value={form.title} onChange={set('title')} required />
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Category" value={form.category} onChange={set('category')}>
            <option value="">Select category</option>
            {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </Select>
          <Select label="Job Type" value={form.jobType} onChange={set('jobType')}>
            <option value="">Select type</option>
            {JOB_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
          <Select label="Experience Level" value={form.experience} onChange={set('experience')}>
            <option value="">Select level</option>
            {EXPERIENCE_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </Select>
          <Select label="Location" value={form.district} onChange={set('district')}>
            <option value="">Select district</option>
            <option value="Remote">Remote</option>
            {NEPAL_DISTRICTS.map(d => <option key={d}>{d}</option>)}
          </Select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Minimum Salary (NPR)" type="number" value={form.salaryMin} onChange={set('salaryMin')} />
          <Input label="Maximum Salary (NPR)" type="number" value={form.salaryMax} onChange={set('salaryMax')} />
        </div>
        <Textarea label="Job Description" value={form.description} onChange={set('description')} rows={6} required />
        <Textarea label="Requirements" value={form.requirements} onChange={set('requirements')} rows={5} required />
        <Textarea label="Benefits & Perks" value={form.benefits} onChange={set('benefits')} rows={3} />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Application Deadline" type="date" value={form.deadline} onChange={set('deadline')} />
          <Input label="Number of Openings" type="number" min={1} value={form.openings} onChange={set('openings')} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 flex-wrap gap-3">
        <Button
          variant="outline-danger"
          icon={Trash2}
          size="sm"
          onClick={() => { if (confirm('Delete this job? This cannot be undone.')) deleteMutation.mutate() }}
          disabled={deleteMutation.isPending}
        >
          Delete Job
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            variant="primary"
            icon={Save}
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
