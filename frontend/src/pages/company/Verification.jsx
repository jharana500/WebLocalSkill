import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Upload, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { companyService } from '@/services/companyService'

const benefits = [
  { icon: '🏆', title: 'Verified Badge', desc: 'A blue checkmark on all your job listings and company profile' },
  { icon: '📈', title: '3x More Applications', desc: 'Verified companies receive significantly more qualified applications' },
  { icon: '⚡', title: 'Priority Listing', desc: 'Your jobs appear at the top of search results' },
  { icon: '🔒', title: 'Trust Signal', desc: 'Job seekers trust verified companies more and apply faster' },
]

const STATUS_STEPS = {
  PENDING: 1,
  UNDER_REVIEW: 2,
  VERIFIED: 3,
  REJECTED: 0,
  DUPLICATE: 0,
}

const STATUS_GUIDANCE = {
  REJECTED: {
    title: 'Verification Rejected',
    message: 'Verification was rejected. Please review the reason below and resubmit your documents.',
  },
  DUPLICATE: {
    title: 'Possible Duplicate',
    message: 'Your company was marked as a possible duplicate of an existing company. If this is a mistake, please contact support or update your registration details and resubmit.',
  },
}

export default function CompanyVerification() {
  const queryClient = useQueryClient()
  const [panNumber, setPanNumber] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const panDocRef = useRef(null)
  const regCertRef = useRef(null)
  const [files, setFiles] = useState({ panDoc: null, regCert: null })
  const [submitError, setSubmitError] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['company', 'verification'],
    queryFn: () => companyService.getVerificationStatus(),
    staleTime: 1000 * 60 * 5,
  })

  const submitMutation = useMutation({
    mutationFn: () => {
      const form = new FormData()
      form.append('panNumber', panNumber)
      form.append('registrationNumber', regNumber)
      if (files.panDoc) form.append('panDoc', files.panDoc)
      if (files.regCert) form.append('registrationCert', files.regCert)
      return companyService.submitVerification(form)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['company', 'verification'])
      queryClient.invalidateQueries(['company', 'profile'])
      setSubmitError(null)
    },
    onError: (err) => setSubmitError(err?.message || 'Submission failed. Please try again.'),
  })

  const verification = data?.verification || data
  const verificationStatus = verification?.status || (data?.isVerified ? 'VERIFIED' : null)

  const stepIdx = STATUS_STEPS[verificationStatus] ?? -1
  const verificationSteps = [
    { title: 'Documents Submitted', desc: 'Upload your company documents', done: stepIdx >= 1, current: stepIdx === 1 },
    { title: 'Under Review', desc: 'Our team is reviewing your documents', done: stepIdx >= 2, current: stepIdx === 2 },
    { title: 'Verification Complete', desc: 'Receive your verified company badge', done: stepIdx >= 3, current: stepIdx === 3 },
  ]

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-5">
        <div className="h-8 bg-slate-100 rounded w-64" />
        <div className="h-48 bg-slate-100 rounded-2xl" />
        <div className="h-40 bg-white border border-slate-200 rounded-xl" />
      </div>
    )
  }

  if (verificationStatus === 'VERIFIED') {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Your Company is Verified!</h2>
        <p className="text-slate-500">You now have a verified badge and priority listing on all your job posts.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Company Verification</h1>
        <p className="text-slate-500 text-sm mt-1">Get verified to build trust and attract better candidates</p>
      </div>

      {verificationStatus === 'UNDER_REVIEW' && (
        <Alert
          type="info"
          title="Application Under Review"
          message="Our team is reviewing your verification documents. This typically takes 2–3 business days. We'll notify you once complete."
          className="mb-6"
        />
      )}
      {STATUS_GUIDANCE[verificationStatus] && (
        <Alert
          type={verificationStatus === 'DUPLICATE' ? 'warning' : 'error'}
          title={STATUS_GUIDANCE[verificationStatus].title}
          message={verification?.reviewNotes || STATUS_GUIDANCE[verificationStatus].message}
          className="mb-6"
        />
      )}

      {/* Benefits */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={24} />
          <h2 className="text-lg font-bold">Why Get Verified?</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {benefits.map(({ icon, title, desc }) => (
            <div key={title} className="bg-white/10 rounded-xl p-4">
              <span className="text-2xl mb-2 block">{icon}</span>
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-blue-200 mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Progress */}
      {verificationStatus && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-6">Verification Progress</h2>
          <div className="space-y-4">
            {verificationSteps.map(({ title, desc, done, current }, i) => (
              <div key={title} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                    done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-200 text-slate-400'
                  )}>
                    {done ? <CheckCircle2 size={16} /> : current ? <Clock size={14} /> : i + 1}
                  </div>
                  {i < verificationSteps.length - 1 && (
                    <div className={cn('w-0.5 flex-1 mt-1', done ? 'bg-emerald-200' : 'bg-slate-100')} style={{ minHeight: 24 }} />
                  )}
                </div>
                <div className="pb-4">
                  <p className={cn('text-sm font-semibold', !done && !current ? 'text-slate-400' : 'text-slate-900')}>
                    {title}
                    {current && <span className="ml-2 text-xs text-blue-600 font-normal">In Progress</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Documents (only if not under review or approved) */}
      {!['UNDER_REVIEW', 'VERIFIED'].includes(verificationStatus) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Submit Documents</h2>
          {submitError && <Alert type="error" message={submitError} className="mb-4" />}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">PAN Certificate</label>
              <div
                onClick={() => panDocRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <Upload size={16} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm text-slate-600">{files.panDoc ? files.panDoc.name : 'Drop file or click to upload'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF or image, PAN certificate from IRD</p>
                </div>
              </div>
              <input ref={panDocRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFiles(f => ({ ...f, panDoc: e.target.files?.[0] }))} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Company Registration Certificate</label>
              <div
                onClick={() => regCertRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-blue-300 transition-colors cursor-pointer"
              >
                <Upload size={16} className="text-slate-400 shrink-0" />
                <div>
                  <p className="text-sm text-slate-600">{files.regCert ? files.regCert.name : 'Drop file or click to upload'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">PDF or image, registration certificate</p>
                </div>
              </div>
              <input ref={regCertRef} type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setFiles(f => ({ ...f, regCert: e.target.files?.[0] }))} />
            </div>

            <Input
              label="PAN Number"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              placeholder="e.g. 123456789"
            />
            <Input
              label="Business Registration Number"
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="e.g. 123456/073/074"
            />

            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !panNumber}
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
