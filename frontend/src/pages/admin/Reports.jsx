import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Download, FileText, Calendar, Users, Building2, Briefcase, TrendingUp } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { cn } from '@/utils/cn'
import { adminService } from '@/services/adminService'

const REPORT_TYPES = [
  {
    id: 'user_activity',
    title: 'User Activity Report',
    description: 'Registrations, logins, profile completions, and engagement by date range.',
    icon: Users,
    color: 'blue',
    formats: ['CSV', 'PDF'],
  },
  {
    id: 'company_summary',
    title: 'Company Summary Report',
    description: 'Active companies, verification status, plan distribution, and job posting volume.',
    icon: Building2,
    color: 'purple',
    formats: ['CSV', 'PDF'],
  },
  {
    id: 'job_listings',
    title: 'Job Listings Report',
    description: 'Posted, active, closed, and flagged jobs with application counts by category.',
    icon: Briefcase,
    color: 'emerald',
    formats: ['CSV'],
  },
  {
    id: 'application_funnel',
    title: 'Application Funnel Report',
    description: 'Application to hire conversion rates across companies, job types, and time periods.',
    icon: TrendingUp,
    color: 'amber',
    formats: ['CSV', 'PDF'],
  },
  {
    id: 'revenue',
    title: 'Revenue Report',
    description: 'Monthly recurring revenue, plan upgrades, churn, and payment failures.',
    icon: TrendingUp,
    color: 'green',
    formats: ['CSV', 'PDF'],
  },
  {
    id: 'verification',
    title: 'Verification Report',
    description: 'Verification requests submitted, approved, rejected, and pending duration.',
    icon: FileText,
    color: 'orange',
    formats: ['CSV'],
  },
]

const COLOR_MAP = {
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  green: 'bg-green-50 text-green-600',
  orange: 'bg-orange-50 text-orange-600',
}

export default function AdminReports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const generateMutation = useMutation({
    mutationFn: ({ type }) => adminService.getReports(type, { from: dateFrom, to: dateTo }),
  })

  const handleGenerate = (id) => generateMutation.mutate({ type: id })

  const setPreset = (preset) => {
    const today = new Date()
    const to = today.toISOString().slice(0, 10)
    let from
    if (preset === 'Last 7 days') {
      from = new Date(+today - 7 * 86400000).toISOString().slice(0, 10)
    } else if (preset === 'This Month') {
      from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
    } else if (preset === 'Last Quarter') {
      from = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().slice(0, 10)
    } else {
      from = new Date(today.getFullYear(), 0, 1).toISOString().slice(0, 10)
    }
    setDateFrom(from)
    setDateTo(to)
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and download platform reports</p>
      </div>

      <Alert
        type="info"
        title="Report generation coming soon"
        message="The report generation API is not yet available on the server. The UI is ready — reports will be downloadable once the backend endpoint is implemented."
      />

      {generateMutation.isError && (
        <Alert
          type="warning"
          title="Not yet available"
          message="Report generation is not yet implemented on the server (501). Check back when the reports API is enabled."
          dismissible
        />
      )}

      {generateMutation.isSuccess && (
        <Alert type="success" message="Report request sent. Download will begin when ready." dismissible />
      )}

      {/* Date Range */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Report Date Range</h3>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['Last 7 days', 'This Month', 'Last Quarter', 'This Year'].map(preset => (
              <button
                key={preset}
                onClick={() => setPreset(preset)}
                className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Report Types */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Available Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_TYPES.map(report => {
            const Icon = report.icon
            const isGenerating = generateMutation.isPending && generateMutation.variables?.type === report.id
            return (
              <div key={report.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', COLOR_MAP[report.color])}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{report.title}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{report.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex gap-1.5">
                        {report.formats.map(f => (
                          <span key={f} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded font-medium">{f}</span>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        icon={isGenerating ? null : Download}
                        loading={isGenerating}
                        onClick={() => handleGenerate(report.id)}
                      >
                        {isGenerating ? 'Generating…' : 'Generate'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Past Reports — empty until backend implements report storage */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Previously Generated Reports</h3>
        </div>
        <div className="px-5 py-10 text-center">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <FileText size={18} className="text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600">No reports generated yet</p>
          <p className="text-xs text-slate-400 mt-1">Reports will appear here once the feature is enabled on the server</p>
        </div>
      </div>
    </div>
  )
}
