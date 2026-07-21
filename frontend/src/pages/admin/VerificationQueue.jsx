import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Clock, CheckCircle2, XCircle, FileText, Globe, MapPin } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatRelativeTime } from '@/utils/formatters'
import { adminService } from '@/services/adminService'
import { toast } from '@/store/uiStore'

const STATUS_TABS = ['all', 'PENDING', 'UNDER_REVIEW']

export default function VerificationQueue() {
  const [statusTab, setStatusTab] = useState('PENDING')
  const [selected, setSelected] = useState(null)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'verification-queue', statusTab],
    queryFn: () => adminService.getVerificationQueue({ status: statusTab !== 'all' ? statusTab : undefined, limit: 50 }),
  })

  const review = useMutation({
    mutationFn: ({ id, decision, notes }) => adminService.reviewVerification(id, decision, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['admin', 'verification-queue'])
      queryClient.invalidateQueries(['admin', 'dashboard'])
      toast.success('Decision saved', `Verification ${variables.decision.toLowerCase()}`)
      setSelected(null)
      setNotes('')
    },
    onError: (err) => toast.error('Error', err.message),
  })

  const verifications = data?.verifications ?? []
  const detail = selected ? verifications.find(v => v.id === selected) : null

  const pendingCount = verifications.filter(v => v.status === 'PENDING').length

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Verification Queue</h1>
          <p className="text-slate-500 text-sm mt-1">{pendingCount} companies pending review</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex gap-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => { setStatusTab(tab); setSelected(null) }}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize', statusTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50')}
              >
                {tab === 'UNDER_REVIEW' ? 'Under Review' : tab === 'PENDING' ? 'Pending' : 'All'}
              </button>
            ))}
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="px-4 py-4 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))
            ) : verifications.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-400">No verifications found</div>
            ) : verifications.map(v => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={cn('w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors', selected === v.id && 'bg-blue-50 border-l-2 border-blue-600')}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{v.company?.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{v.company?.industry || 'Unknown industry'}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                      <Clock size={11} /> {formatRelativeTime(v.submittedAt)}
                    </div>
                  </div>
                  <Badge variant={v.status === 'PENDING' ? 'warning' : 'primary'} size="xs">
                    {v.status === 'UNDER_REVIEW' ? 'Reviewing' : 'Pending'}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {detail ? (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Review: {detail.company?.name}</h3>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Industry', value: detail.company?.industry || '—', icon: ShieldCheck },
                    { label: 'Location', value: detail.company?.district || '—', icon: MapPin },
                    { label: 'Website', value: detail.company?.website || '—', icon: Globe },
                    { label: 'Email', value: detail.company?.user?.email || '—', icon: FileText },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <FileText size={15} className="text-slate-400" /> Submitted Documents
                  </p>
                  <div className="space-y-2">
                    {detail.panDocumentUrl && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <FileText size={14} className="text-blue-600" />
                          <span className="text-sm text-slate-700">PAN Certificate</span>
                        </div>
                        <a href={detail.panDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium hover:underline">View</a>
                      </div>
                    )}
                    {detail.registrationCertUrl && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <FileText size={14} className="text-blue-600" />
                          <span className="text-sm text-slate-700">Registration Certificate</span>
                        </div>
                        <a href={detail.registrationCertUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 font-medium hover:underline">View</a>
                      </div>
                    )}
                    {!detail.panDocumentUrl && !detail.registrationCertUrl && (
                      <p className="text-sm text-slate-400 italic">No documents uploaded</p>
                    )}
                  </div>
                </div>

                {detail.panNumber && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-1">PAN Number</p>
                    <p className="text-sm font-medium text-slate-900">{detail.panNumber}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-slate-500 mb-2">Admin Notes (optional)</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add review notes..."
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      icon={CheckCircle2}
                      className="flex-1"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: detail.id, decision: 'APPROVED', notes })}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline-danger"
                      icon={XCircle}
                      className="flex-1"
                      disabled={review.isPending}
                      onClick={() => review.mutate({ id: detail.id, decision: 'REJECTED', notes })}
                    >
                      Reject
                    </Button>
                    {detail.status === 'PENDING' && (
                      <Button
                        variant="outline"
                        disabled={review.isPending}
                        onClick={() => review.mutate({ id: detail.id, decision: 'UNDER_REVIEW', notes })}
                      >
                        Mark Under Review
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center p-16 text-center">
              <ShieldCheck size={40} className="text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Select a company to review</p>
              <p className="text-slate-400 text-sm mt-1">Choose from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
