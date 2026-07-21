import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Users, UserCheck, TrendingUp, Plus, ArrowRight, Clock } from 'lucide-react'
import { KPIWidget, Badge, VerifiedBadge, Alert, Button } from '@/components/ui'
import { AreaChartCard, FunnelCard } from '@/components/ui/AnalyticsChart'
import useAuthStore from '@/store/authStore'
import { formatRelativeTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import { companyService } from '@/services/companyService'

const STATUS_STYLES = {
  PENDING: 'bg-blue-50 text-blue-700 border-blue-200',
  REVIEWING: 'bg-amber-50 text-amber-700 border-amber-200',
  SHORTLISTED: 'bg-purple-50 text-purple-700 border-purple-200',
  HIRED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  WITHDRAWN: 'bg-slate-50 text-slate-500 border-slate-200',
}
const STATUS_LABELS = {
  PENDING: 'Applied', REVIEWING: 'Under Review', SHORTLISTED: 'Shortlisted',
  HIRED: 'Hired', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const companyName = user?.company?.name || 'Your Company'
  const isVerified = user?.company?.isVerified

  const { data, isLoading } = useQuery({
    queryKey: ['company', 'dashboard'],
    queryFn: companyService.getDashboardStats,
    staleTime: 1000 * 60 * 2,
  })

  const stats = data?.stats ?? {}
  const chartData = data?.chartData ?? []
  const funnelStages = (data?.funnelStages ?? []).map(s => ({ label: s.label, value: s.count, color: s.color }))
  const recentApplicants = data?.recentApplicants ?? []

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-slate-500 text-sm">Recruiter Dashboard</p>
          <h1 className="text-2xl font-bold text-slate-900">{companyName}</h1>
          <div className="flex items-center gap-2 mt-1">
            {isVerified ? (
              <VerifiedBadge />
            ) : (
              <Badge variant="warning" size="sm" dot>Verification Pending</Badge>
            )}
          </div>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => navigate('/company/post-job')}>
          Post a Job
        </Button>
      </div>

      {!isVerified && (
        <Alert
          type="warning"
          title="Complete Company Verification"
          message="Get a verified badge to build trust and attract better candidates. Verified companies get 3x more applications."
          className="mb-6"
          actions={
            <Button variant="warning" size="sm" onClick={() => navigate('/company/verification')}>
              Start Verification
            </Button>
          }
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)
        ) : (
          <>
            <KPIWidget title="Active Jobs" value={stats.activeJobs?.toLocaleString() ?? '0'} change={0} changeLabel="this month" icon={Briefcase} color="blue" />
            <KPIWidget title="Total Applications" value={stats.totalApplications?.toLocaleString() ?? '0'} change={0} changeLabel="this month" icon={Users} color="purple" />
            <KPIWidget title="Shortlisted" value={stats.shortlisted?.toLocaleString() ?? '0'} change={0} changeLabel="this month" icon={UserCheck} color="amber" />
            <KPIWidget title="Hired This Month" value={stats.hired?.toLocaleString() ?? '0'} change={0} changeLabel="vs last month" icon={TrendingUp} color="emerald" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <AreaChartCard
          title="Application Trend (Last 7 Weeks)"
          data={chartData}
          dataKeys={['applications', 'shortlisted']}
          colors={['#2563EB', '#10b981']}
          className="lg:col-span-2"
        />
        <FunnelCard title="Hiring Funnel" stages={funnelStages} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Recent Applicants</h2>
          <button
            onClick={() => navigate('/company/applicants')}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-1" />
                  <div className="h-3 bg-slate-50 rounded w-1/4" />
                </div>
              </div>
            ))
          ) : recentApplicants.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No applicants yet. Post a job to get started.</div>
          ) : recentApplicants.map(app => {
            const profile = app.user?.profile
            const name = profile ? `${profile.firstName} ${profile.lastName}`.trim() : app.user?.email
            const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2)
            const s = STATUS_STYLES[app.status] || STATUS_STYLES.PENDING
            return (
              <div
                key={app.id}
                onClick={() => navigate(`/company/applicants/${app.id}`)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={name} className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{name}</p>
                  <p className="text-xs text-slate-500">{app.job?.title}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', s)}>
                    {STATUS_LABELS[app.status]}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={10} /> {formatRelativeTime(app.createdAt)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
