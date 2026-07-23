import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Globe, MapPin, Users, Calendar, Briefcase, ShieldCheck, ShieldX,
  Clock, RotateCcw, Copy, RefreshCw, FileText,
} from 'lucide-react'
import { Button, Badge, VerifiedBadge, Alert, EmptyState } from '@/components/ui'
import { adminService } from '@/services/adminService'
import { formatDate, formatRelativeTime } from '@/utils/formatters'
import { toast } from '@/store/uiStore'
import { CompanyReviewModal } from '@/components/admin/CompanyReviewModal'
import { DuplicateComparisonView } from '@/components/admin/DuplicateComparisonView'

const PLAN_BADGE = { FREE: 'default', STARTER: 'default', GROWTH: 'primary', ENTERPRISE: 'purple' }
const STATUS_BADGE = { PENDING: 'warning', UNDER_REVIEW: 'primary', VERIFIED: 'success', REJECTED: 'danger', DUPLICATE: 'purple' }
const RISK_BADGE = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'default' }

export default function CompanyDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [modalAction, setModalAction] = useState(null)
  const [showDuplicateCheck, setShowDuplicateCheck] = useState(searchParams.get('tab') === 'duplicate')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'company', id],
    queryFn: () => adminService.getCompanyById(id),
    staleTime: 1000 * 60 * 2,
  })

  const duplicateCheckQuery = useQuery({
    queryKey: ['admin', 'company', id, 'duplicate-check'],
    queryFn: () => adminService.checkCompanyDuplicates(id),
    enabled: showDuplicateCheck,
  })

  const actionMutation = useMutation({
    mutationFn: ({ action, payload }) => {
      if (action === 'under-review') return adminService.markCompanyUnderReview(id, payload.reason)
      if (action === 'verify') return adminService.verifyCompany(id, payload.reason)
      if (action === 'reject') return adminService.rejectCompany(id, payload.reason)
      if (action === 'mark-duplicate') return adminService.markCompanyDuplicate(id, payload)
      if (action === 'restore') return adminService.restoreCompany(id, payload)
      return Promise.reject(new Error('Unknown action'))
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'company', id] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'verification-companies'] })
      toast.success('Updated', res?.message || 'Company updated')
      setModalAction(null)
    },
    onError: (err) => toast.error('Action failed', err.message || 'Please try again.'),
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-48" />
            <div className="bg-white border border-slate-200 rounded-xl h-48" />
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-56" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Could not load this company</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
          <Button variant="outline" icon={RefreshCw} onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    )
  }

  const company = data?.company
  const applicationCount = data?.applicationCount || 0
  const auditLog = data?.auditLog || []
  const verification = company?.verification
  const status = verification?.status || 'PENDING'
  const jobs = company?.jobs || []
  const totalJobs = company?._count?.jobs ?? jobs.length
  const activeJobs = jobs.filter((j) => j.isActive).length
  const initials = company?.name?.split(' ').map((w) => w[0]).join('').slice(0, 2) || 'CO'

  const duplicateAnalysis = duplicateCheckQuery.data
  const matches = duplicateAnalysis?.matches || []

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Company Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="w-16 h-16 rounded-xl object-cover border border-slate-100 shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{company?.name}</h2>
                  {company?.isVerified && <VerifiedBadge />}
                  <Badge variant={STATUS_BADGE[status] || 'default'} size="xs">{status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  {company?.district && <span className="flex items-center gap-1.5"><MapPin size={12} /> {company.district}</span>}
                  {company?.size && <span className="flex items-center gap-1.5"><Users size={12} /> {company.size} employees</span>}
                  {company?.createdAt && <span className="flex items-center gap-1.5"><Calendar size={12} /> Registered {formatDate(company.createdAt)}</span>}
                  {company?.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                      <Globe size={12} /> Website
                    </a>
                  )}
                </div>
              </div>
            </div>
            {company?.description && (
              <p className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">{company.description}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Jobs', value: totalJobs },
              { label: 'Active Jobs', value: activeJobs },
              { label: 'Applications', value: applicationCount },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Verification */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Verification</h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-500">Registration Number</p><p className="font-medium text-slate-900">{verification?.registrationNumber || '—'}</p></div>
                <div><p className="text-xs text-slate-500">PAN Number</p><p className="font-medium text-slate-900">{verification?.panNumber || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Reviewed By</p><p className="font-medium text-slate-900">{verification?.reviewedBy?.email || '—'}</p></div>
                <div><p className="text-xs text-slate-500">Reviewed At</p><p className="font-medium text-slate-900">{verification?.reviewedAt ? formatDate(verification.reviewedAt) : '—'}</p></div>
              </div>
              {verification?.reviewNotes && (
                <Alert type={status === 'REJECTED' ? 'error' : 'info'} title="Review Notes" message={verification.reviewNotes} />
              )}
              {status === 'DUPLICATE' && verification?.duplicateOfCompany && (
                <Alert
                  type="warning"
                  title="Marked as duplicate"
                  message={`Flagged as a possible duplicate of ${verification.duplicateOfCompany.name}.`}
                />
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" size="sm" icon={Clock} onClick={() => setModalAction('under-review')}>Mark Under Review</Button>
                <Button variant="outline" size="sm" icon={ShieldCheck} onClick={() => setModalAction('verify')}>Verify</Button>
                <Button variant="outline-danger" size="sm" icon={ShieldX} onClick={() => setModalAction('reject')}>Reject</Button>
                <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setModalAction('restore')}>Restore</Button>
                <Button variant="outline" size="sm" icon={Copy} onClick={() => setShowDuplicateCheck(true)}>Run Duplicate Check</Button>
              </div>
            </div>
          </div>

          {/* Duplicate check */}
          {showDuplicateCheck && (
            <div className="space-y-4">
              {duplicateCheckQuery.isLoading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">Analyzing possible duplicates...</div>
              ) : duplicateCheckQuery.isError ? (
                <Alert type="error" message="Could not run duplicate analysis." />
              ) : matches.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No likely duplicates found" size="sm" />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">Overall risk:</span>
                    <Badge variant={RISK_BADGE[duplicateAnalysis.riskLevel]} size="sm">{duplicateAnalysis.riskLevel} ({duplicateAnalysis.riskScore})</Badge>
                    <Button
                      variant="outline-danger"
                      size="xs"
                      className="ml-auto"
                      onClick={() => setModalAction('mark-duplicate')}
                    >
                      Mark Duplicate
                    </Button>
                  </div>
                  {matches.map((match) => (
                    <DuplicateComparisonView key={match.companyId} company={duplicateAnalysis.company} match={match} />
                  ))}
                </>
              )}
            </div>
          )}

          {/* Review history */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <FileText size={15} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Review History</h3>
            </div>
            {auditLog.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No review actions yet</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{entry.action.replace('_', ' ')}</span>
                        {' '}by {entry.admin?.email || 'admin'}
                      </p>
                      {entry.reason && <p className="text-xs text-slate-500 mt-0.5">{entry.reason}</p>}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {jobs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Job Listings</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {jobs.slice(0, 8).map((job) => (
                  <div key={job.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Briefcase size={15} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.jobType} · {job._count?.applications || 0} applications</p>
                      </div>
                    </div>
                    <Badge variant={job.isActive ? 'success' : 'default'} size="xs">{job.isActive ? 'Active' : 'Draft'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Owner</h3>
            <div className="space-y-3">
              {[
                { label: 'Email', value: company?.user?.email || '—' },
                { label: 'Account Status', value: company?.user?.isActive !== false ? 'Active' : 'Deactivated' },
                { label: 'Account Created', value: formatDate(company?.user?.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-medium text-slate-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Company Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Company ID', value: company?.id?.slice(0, 8) + '...' },
                { label: 'Industry', value: company?.industry || '—' },
                { label: 'Phone', value: company?.phone || '—' },
                { label: 'Plan', value: <Badge variant={PLAN_BADGE[company?.plan] || 'default'} size="xs">{company?.plan || 'FREE'}</Badge> },
                { label: 'Account Standing', value: company?.status || 'ACTIVE' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-medium text-slate-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CompanyReviewModal
        open={!!modalAction}
        action={modalAction}
        company={company}
        matches={matches}
        onClose={() => setModalAction(null)}
        onConfirm={(payload) => actionMutation.mutate({ action: modalAction, payload })}
        loading={actionMutation.isPending}
      />
    </div>
  )
}
