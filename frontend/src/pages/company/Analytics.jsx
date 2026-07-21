import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AreaChartCard, BarChartCard, FunnelCard } from '@/components/ui/AnalyticsChart'
import { KPIWidget } from '@/components/ui'
import { cn } from '@/utils/cn'
import { companyService } from '@/services/companyService'

const RANGES = ['7d', '30d', '90d', '12m']

export default function CompanyAnalytics() {
  const [range, setRange] = useState('30d')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['company', 'analytics', range],
    queryFn: () => companyService.getAnalytics(range),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
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

  const { appTrend = [], jobPerformance = [], funnel = [], summary = {} } = data

  const funnelStages = funnel.map((f, i) => ({
    label: f.label,
    value: f.count,
    color: ['#2563eb', '#8b5cf6', '#f59e0b', '#10b981'][i] || '#94a3b8',
  }))

  const chartAppTrend = appTrend.map(d => ({ name: d.date, applications: d.applications }))
  const chartJobPerf = jobPerformance.map(j => ({
    name: j.title.length > 18 ? j.title.slice(0, 18) + '…' : j.title,
    applications: j.applications,
    shortlisted: j.shortlisted,
  }))

  const maxApps = chartJobPerf.length > 0 ? Math.max(...chartJobPerf.map(j => j.applications)) : 1

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Insights into your hiring performance</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KPIWidget title="Total Applications" value={summary.total?.toLocaleString() ?? '0'} change={0} changeLabel="this period" icon={null} color="blue" />
        <KPIWidget title="Shortlisted" value={summary.shortlisted?.toLocaleString() ?? '0'} change={0} changeLabel="this period" icon={null} color="amber" />
        <KPIWidget title="Hired" value={summary.hired?.toLocaleString() ?? '0'} change={0} changeLabel="this period" icon={null} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <AreaChartCard
          title="Application Trend"
          data={chartAppTrend}
          dataKeys={['applications']}
          colors={['#2563EB']}
        />
        {chartJobPerf.length > 0 ? (
          <BarChartCard
            title="Applications per Job Listing"
            data={chartJobPerf}
            dataKeys={['applications', 'shortlisted']}
            colors={['#2563EB', '#10b981']}
          />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl flex items-center justify-center p-12 text-sm text-slate-400">
            No job performance data yet
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <FunnelCard title="Hiring Funnel" stages={funnelStages} />
        {chartJobPerf.length > 0 && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-5">Top Performing Job Posts</h3>
            <div className="space-y-4">
              {chartJobPerf.slice(0, 5).map(job => (
                <div key={job.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{job.name}</span>
                    <span className="text-xs text-slate-500">{job.applications} applications</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(job.applications / maxApps) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
