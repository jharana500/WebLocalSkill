import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KPIWidget } from '@/components/ui'
import { AreaChartCard, BarChartCard, LineChartCard, FunnelCard } from '@/components/ui/AnalyticsChart'
import { cn } from '@/utils/cn'
import { adminService } from '@/services/adminService'

const RANGES = ['7d', '30d', '90d', '12m']

export default function AdminAnalytics() {
  const [range, setRange] = useState('30d')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => adminService.getAnalytics(range),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="h-10 w-40 bg-slate-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
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
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Failed to load analytics</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  const { userGrowth = [], jobActivity = [], applicationTrend = [], platformFunnel = [], topCategories = [] } = data

  const latestUsers = userGrowth[userGrowth.length - 1]
  const latestJobs = jobActivity[jobActivity.length - 1]
  const latestApps = applicationTrend[applicationTrend.length - 1]

  const funnelStages = platformFunnel.map(f => ({ label: f.stage, value: f.count, color: '#2563eb' }))
  const chartUserGrowth = userGrowth.map(m => ({ name: m.month, jobSeekers: m.users, companies: m.companies }))
  const chartAppTrend = applicationTrend.map(m => ({ name: m.month, applications: m.applications }))
  const chartJobActivity = jobActivity.map(m => ({ name: m.month, posted: m.posted, closed: m.closed }))

  const maxJobCount = topCategories.length > 0 ? Math.max(...topCategories.map(c => c._count?.category || 0)) : 1

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">In-depth usage and growth metrics</p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn('px-3 py-1.5 text-sm font-medium rounded-lg transition-all', range === r ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIWidget title="New Users" value={latestUsers?.users?.toLocaleString() ?? '0'} change={0} changeLabel="last period" icon={null} color="blue" />
        <KPIWidget title="New Companies" value={latestUsers?.companies?.toLocaleString() ?? '0'} change={0} changeLabel="last period" icon={null} color="purple" />
        <KPIWidget title="Jobs Posted" value={latestJobs?.posted?.toLocaleString() ?? '0'} change={0} changeLabel="last period" icon={null} color="emerald" />
        <KPIWidget title="Applications" value={latestApps?.applications?.toLocaleString() ?? '0'} change={0} changeLabel="last period" icon={null} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AreaChartCard
          title="User & Company Registrations"
          data={chartUserGrowth}
          dataKeys={['jobSeekers', 'companies']}
          colors={['#2563EB', '#8b5cf6']}
        />
        <LineChartCard
          title="Application Volume"
          data={chartAppTrend}
          dataKeys={['applications']}
          colors={['#10b981']}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarChartCard
          title="Job Listings Activity"
          data={chartJobActivity}
          dataKeys={['posted', 'closed']}
          colors={['#2563EB', '#e2e8f0']}
        />
        <FunnelCard title="Platform Engagement Funnel" stages={funnelStages} />
      </div>

      {topCategories.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Top Job Categories</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {topCategories.map((cat, i) => {
              const count = cat._count?.category || 0
              return (
                <div key={cat.category} className="flex items-center gap-4 px-5 py-4">
                  <span className="text-xs font-semibold text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-900">{cat.category}</span>
                      <span className="text-xs text-slate-500">{count} jobs</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(count / maxJobCount) * 100}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
