import { cn } from '@/utils/cn'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export function KPIWidget({ title, value, change, changeLabel, icon: Icon, color = 'blue', loading = false }) {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'bg-emerald-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'bg-rose-100' },
    slate: { bg: 'bg-slate-50', text: 'text-slate-600', icon: 'bg-slate-100' },
  }

  const c = colorMap[color] || colorMap.blue

  const changeIsPositive = typeof change === 'number' ? change > 0 : null
  const changeIsNeutral = change === 0

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-9 w-9 rounded-lg" />
        </div>
        <div className="skeleton h-8 w-20 rounded mb-1" />
        <div className="skeleton h-3 w-32 rounded" />
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', c.icon)}>
            <Icon size={18} className={c.text} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {changeIsNeutral ? (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Minus size={12} />
              <span>No change</span>
            </span>
          ) : changeIsPositive ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <TrendingUp size={12} />
              <span>+{change}%</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <TrendingDown size={12} />
              <span>{change}%</span>
            </span>
          )}
          {changeLabel && <span className="text-xs text-slate-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  )
}
