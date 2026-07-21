import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Globe, MapPin, Users, Calendar, Briefcase, ShieldCheck, ShieldOff } from 'lucide-react'
import { Button, Badge, VerifiedBadge } from '@/components/ui'
import { adminService } from '@/services/adminService'
import { formatDate } from '@/utils/formatters'

const PLAN_BADGE = { FREE: 'default', STARTER: 'default', GROWTH: 'primary', ENTERPRISE: 'purple' }

export default function CompanyDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'company', id],
    queryFn: () => adminService.getCompanyById(id),
    staleTime: 1000 * 60 * 2,
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status) => adminService.updateCompanyStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'company', id]),
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-48" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-20" />)}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl h-48" />
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-36" />
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-36" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Company not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const company = data?.company || data
  const jobs = company?.jobs || []
  const totalJobs = jobs.length
  const activeJobs = jobs.filter(j => j.isActive).length
  const totalApplications = jobs.reduce((sum, j) => sum + (j._count?.applications || 0), 0)
  const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'CO'

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Company Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
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
                  <Badge variant={company?.isActive !== false ? 'success' : 'danger'} size="xs">
                    {company?.isActive !== false ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {company?.tagline && <p className="text-slate-500 text-sm mt-1">{company.tagline}</p>}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  {company?.district && <span className="flex items-center gap-1.5"><MapPin size={12} /> {company.district}</span>}
                  {company?.size && <span className="flex items-center gap-1.5"><Users size={12} /> {company.size} employees</span>}
                  {company?.founded && <span className="flex items-center gap-1.5"><Calendar size={12} /> Founded {company.founded}</span>}
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
              { label: 'Applications', value: totalApplications },
            ].map(s => (
              <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {jobs.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Job Listings</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {jobs.slice(0, 8).map(job => (
                  <div key={job.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Briefcase size={15} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{job.title}</p>
                        <p className="text-xs text-slate-500">{job.jobType} · {job._count?.applications || 0} applications</p>
                      </div>
                    </div>
                    <Badge variant={job.isActive ? 'success' : 'default'} size="xs">{job.isActive ? 'Active' : 'Closed'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Admin Actions</h3>
            <div className="space-y-2">
              <Button
                variant={company?.isVerified ? 'outline-danger' : 'outline'}
                size="sm"
                fullWidth
                icon={company?.isVerified ? ShieldOff : ShieldCheck}
                onClick={() => updateStatusMutation.mutate(company?.isVerified ? 'REJECTED' : 'APPROVED')}
                disabled={updateStatusMutation.isPending}
              >
                {company?.isVerified ? 'Revoke Verification' : 'Approve Verification'}
              </Button>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Company Info</h3>
            <div className="space-y-3">
              {[
                { label: 'Company ID', value: company?.id?.slice(0, 8) + '...' },
                { label: 'Industry', value: company?.industry || '—' },
                { label: 'Plan', value: <Badge variant={PLAN_BADGE[company?.plan] || 'default'} size="xs">{company?.plan || 'FREE'}</Badge> },
                { label: 'Email', value: company?.email || '—' },
                { label: 'Registered', value: formatDate(company?.createdAt) },
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
    </div>
  )
}
