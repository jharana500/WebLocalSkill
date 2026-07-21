import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { cn } from '@/utils/cn'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-medium text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-500 capitalize">{entry.name}:</span>
          <span className="font-semibold text-slate-900">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AreaChartCard({ title, data, dataKeys, colors = ['#2563EB'], className, height = 220 }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-5', className)}>
      <h3 className="text-sm font-semibold text-slate-900 mb-5">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            {dataKeys.map((key, i) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i] || '#2563EB'} stopOpacity={0.15} />
                <stop offset="95%" stopColor={colors[i] || '#2563EB'} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.map((key, i) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i] || '#2563EB'}
              strokeWidth={2}
              fill={`url(#grad-${key})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChartCard({ title, data, dataKeys, colors = ['#2563EB', '#10b981'], className, height = 220 }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-5', className)}>
      <h3 className="text-sm font-semibold text-slate-900 mb-5">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={colors[i] || '#2563EB'} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function LineChartCard({ title, data, dataKeys, colors = ['#2563EB'], className, height = 220 }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-5', className)}>
      <h3 className="text-sm font-semibold text-slate-900 mb-5">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[i] || '#2563EB'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function FunnelCard({ title, stages, className }) {
  const max = Math.max(...stages.map((s) => s.value))
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-5', className)}>
      <h3 className="text-sm font-semibold text-slate-900 mb-5">{title}</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-600">{stage.label}</span>
              <span className="text-xs font-semibold text-slate-900">{stage.value}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                style={{ width: `${(stage.value / max) * 100}%`, backgroundColor: stage.color || '#2563eb' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
