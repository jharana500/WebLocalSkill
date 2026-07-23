import { Badge } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/formatters'

const RISK_VARIANT = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'default' }

const FIELD_ROWS = [
  { key: 'name', label: 'Company Name' },
  { key: 'normalizedName', label: 'Normalized Name' },
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'panNumber', label: 'Tax / PAN Number' },
  { key: 'websiteDomain', label: 'Website Domain' },
  { key: 'phone', label: 'Phone' },
  { key: 'ownerEmailDomain', label: 'Owner Email Domain' },
  { key: 'district', label: 'Location' },
  { key: 'verificationStatus', label: 'Verification Status' },
]

function cellState(a, b) {
  const valA = a === null || a === undefined || a === '' ? null : String(a).toLowerCase()
  const valB = b === null || b === undefined || b === '' ? null : String(b).toLowerCase()
  if (valA === null && valB === null) return 'empty'
  if (valA === null || valB === null) return 'missing'
  if (valA === valB) return 'match'
  return 'conflict'
}

const STATE_STYLE = {
  match: 'bg-red-50 text-red-800 border-red-200',
  conflict: 'bg-white text-slate-700 border-slate-200',
  missing: 'bg-amber-50 text-amber-700 border-amber-200',
  empty: 'bg-slate-50 text-slate-400 border-slate-200',
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function DuplicateComparisonView({ company, match }) {
  if (!company?.details || !match?.details) return null
  const a = company.details
  const b = match.details

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Comparing with {match.companyName}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Match score {match.score} / 100</p>
        </div>
        <Badge variant={RISK_VARIANT[match.riskLevel] || 'default'} size="sm">
          {match.riskLevel} risk
        </Badge>
      </div>

      {match.reasons?.length > 0 && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <ul className="text-xs text-slate-600 space-y-1">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-slate-400" /> {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Field</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">This Company</th>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{match.companyName}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FIELD_ROWS.map(({ key, label }) => {
              const state = cellState(a[key], b[key])
              return (
                <tr key={key}>
                  <td className="px-5 py-2.5 text-xs font-medium text-slate-500">{label}</td>
                  <td className="px-5 py-2.5">
                    <span className={cn('inline-block px-2 py-0.5 rounded border text-xs', STATE_STYLE[state])}>
                      {displayValue(a[key])}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={cn('inline-block px-2 py-0.5 rounded border text-xs', STATE_STYLE[state])}>
                      {displayValue(b[key])}
                    </span>
                  </td>
                </tr>
              )
            })}
            <tr>
              <td className="px-5 py-2.5 text-xs font-medium text-slate-500">Created</td>
              <td className="px-5 py-2.5 text-xs text-slate-700">{formatDate(a.createdAt)}</td>
              <td className="px-5 py-2.5 text-xs text-slate-700">{formatDate(b.createdAt)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
        Matching values are highlighted red — this is informational only, no automatic decision is made.
      </p>
    </div>
  )
}
