import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { KPIWidget, Badge } from '@/components/ui'
import { AreaChartCard } from '@/components/ui/AnalyticsChart'
import { cn } from '@/utils/cn'
import { adminService } from '@/services/adminService'

const RANGES = ['7d', '30d', '90d', '12m']
const PLAN_COLOR = { FREE: 'default', STARTER: 'default', GROWTH: 'primary', ENTERPRISE: 'purple' }

export default function AdminRevenue() {
  const [range, setRange] = useState('30d')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'revenue', range],
    queryFn: () => adminService.getRevenue(range),
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">Failed to load revenue data</p>
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    )
  }

  const { summary = {}, planBreakdown = [], revenueTrend = [], recentTransactions = [] } = data
  const totalRevenue = planBreakdown.reduce((s, p) => s + (p.revenue || 0), 0)
  const chartData = revenueTrend.map(m => ({ name: m.month, revenue: m.revenue }))

  return (
    <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
          <p className="text-slate-500 text-sm mt-1">Subscription and billing overview</p>
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
        <KPIWidget title="MRR" value={`NPR ${(summary.mrr || 0).toLocaleString()}`} change={0} changeLabel="vs last month" icon={null} color="green" />
        <KPIWidget title="ARR (Projected)" value={`NPR ${(summary.arr || 0).toLocaleString()}`} change={0} changeLabel="annualized" icon={null} color="blue" />
        <KPIWidget title="Paying Companies" value={(summary.totalPayingCompanies || 0).toLocaleString()} change={0} changeLabel="vs last month" icon={null} color="purple" />
        <KPIWidget title="Total Revenue" value={`NPR ${totalRevenue.toLocaleString()}`} change={0} changeLabel="all plans" icon={null} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AreaChartCard
          title="Monthly Recurring Revenue (NPR)"
          data={chartData}
          dataKeys={['revenue']}
          colors={['#10b981']}
        />
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-5">Revenue by Plan</h3>
          {planBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No subscription data yet</p>
          ) : (
            <div className="space-y-4">
              {planBreakdown.map(plan => (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={PLAN_COLOR[plan.plan] || 'default'} size="xs">{plan.plan}</Badge>
                      <span className="text-sm text-slate-600">{plan.companies} companies</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">NPR {(plan.revenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full" style={{ width: totalRevenue > 0 ? `${(plan.revenue / totalRevenue) * 100}%` : '0%' }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {totalRevenue > 0 ? Math.round((plan.revenue / totalRevenue) * 100) : 0}% of total revenue
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Total Revenue</span>
            <span className="text-base font-bold text-slate-900">NPR {totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Recent Transactions</h3>
          <button className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline">
            <Download size={13} /> Export CSV
          </button>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No transaction history available. Billing integration is not yet configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Transaction ID', 'Company', 'Plan', 'Amount', 'Date', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTransactions.map((txn, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-mono text-slate-600">{txn.id}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{txn.company}</td>
                    <td className="px-5 py-3.5"><Badge variant={PLAN_COLOR[txn.plan] || 'default'} size="xs">{txn.plan}</Badge></td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">NPR {txn.amount?.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{txn.date}</td>
                    <td className="px-5 py-3.5"><Badge variant={txn.status === 'paid' ? 'success' : 'danger'} size="xs">{txn.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
