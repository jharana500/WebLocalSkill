import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, Building2, Briefcase, FileText, DollarSign, ShieldCheck } from 'lucide-react'
import { KPIWidget, Badge } from '@/components/ui'
import { AreaChartCard } from '@/components/ui/AnalyticsChart'
import { adminService } from '@/services/adminService'
import { formatRelativeTime } from '@/utils/formatters'

function activityBadge(type) {
  const map = {
    new_user: { label: 'New User', variant: 'primary' },
    company_verification: { label: 'Verification', variant: 'warning' },
    job_posted: { label: 'Job Posted', variant: 'success' },
    plan_upgrade: { label: 'Upgrade', variant: 'purple' },
    job_flagged: { label: 'Flagged', variant: 'danger' },
  }
  return map[type] || { label: 'Event', variant: 'default' }
}

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminService.getDashboardStats,
    staleTime: 1000 * 60 * 2,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 bg-slate-100 rounded-xl" />
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-20">
          <p className="text-red-600 font-medium mb-3">Failed to load dashboard data</p>
          <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">Retry</button>
        </div>
      </div>
    )
  }

  const { stats, registrationTrend, revenueTrend, recentActivity, pendingVerifications } = data

  const KPIS = [
    { title: 'Total Users', value: stats.totalUsers?.toLocaleString() ?? '0', change: stats.newUsersThisMonth ?? 0, icon: Users, color: 'blue' },
    { title: 'Companies', value: stats.totalCompanies?.toLocaleString() ?? '0', change: 0, icon: Building2, color: 'purple' },
    { title: 'Active Jobs', value: stats.totalJobs?.toLocaleString() ?? '0', change: stats.newJobsThisMonth ?? 0, icon: Briefcase, color: 'emerald' },
    { title: 'Applications', value: stats.totalApplications?.toLocaleString() ?? '0', change: 0, icon: FileText, color: 'amber' },
    { title: 'Monthly Revenue', value: 'NPR —', change: 0, icon: DollarSign, color: 'green' },
    { title: 'Pending Verifications', value: stats.pendingVerifications?.toLocaleString() ?? '0', change: 0, icon: ShieldCheck, color: 'orange' },
  ]

  const chartTrend = registrationTrend?.map(m => ({ name: m.month, users: m.users, companies: m.companies })) ?? []
  const revenueChart = revenueTrend?.map(m => ({ name: m.month, revenue: m.revenue })) ?? []

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {KPIS.map(k => (
          <KPIWidget key={k.title} title={k.title} value={k.value} change={k.change} changeLabel="this month" icon={null} color={k.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AreaChartCard
          title="User & Company Registrations"
          data={chartTrend}
          dataKeys={['users', 'companies']}
          colors={['#2563EB', '#8b5cf6']}
        />
        <AreaChartCard
          title="Monthly Revenue (NPR)"
          data={revenueChart}
          dataKeys={['revenue']}
          colors={['#10b981']}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentActivity?.length > 0 ? recentActivity.map((event, idx) => {
              const badge = activityBadge(event.type)
              return (
                <div key={idx} className="flex items-center justify-between px-5 py-3.5 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant={badge.variant} size="xs">{badge.label}</Badge>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-900 truncate block">{event.message}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatRelativeTime(event.time)}</span>
                </div>
              )
            }) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No recent activity</div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Pending Verifications</h3>
            <Badge variant="warning" size="xs">{pendingVerifications?.length ?? 0}</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {pendingVerifications?.length > 0 ? pendingVerifications.map(v => (
              <div key={v.id} className="px-5 py-4">
                <p className="text-sm font-medium text-slate-900">{v.company?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{v.company?.industry || 'Unknown industry'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{formatRelativeTime(v.submittedAt)}</span>
                  <Link to="/admin/verification-queue" className="text-xs text-blue-600 font-medium hover:underline">Review</Link>
                </div>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No pending verifications</div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <Link to="/admin/verification-queue" className="text-xs text-blue-600 font-medium hover:underline">View all →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
