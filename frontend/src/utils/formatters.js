import { formatDistanceToNow, format, parseISO } from 'date-fns'

export const formatCurrency = (amount, currency = 'NPR') => {
  if (!amount) return 'Negotiable'
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency: currency === 'NPR' ? 'NPR' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatSalaryRange = (min, max) => {
  if (!min && !max) return 'Negotiable'
  if (!max) return `NPR ${formatNumber(min)}+`
  return `NPR ${formatNumber(min)} – ${formatNumber(max)}`
}

export const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 100000) return `${(num / 100000).toFixed(1)}L`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

export const formatDate = (date) => {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM dd, yyyy')
  } catch {
    return ''
  }
}

export const formatRelativeTime = (date) => {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ''
  }
}

export const formatJobType = (type) => {
  const map = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    internship: 'Internship',
    freelance: 'Freelance',
    remote: 'Remote',
  }
  return map[type] || type
}

export const formatExperience = (level) => {
  const map = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead',
  }
  return map[level] || level
}

export const formatApplicationStatus = (status) => {
  const map = {
    applied: 'Applied',
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    interview: 'Interview',
    offered: 'Offered',
    hired: 'Hired',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  }
  return map[status] || status
}

export const getStatusColor = (status) => {
  const map = {
    applied: 'bg-blue-50 text-blue-700 border-blue-200',
    under_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    shortlisted: 'bg-purple-50 text-purple-700 border-purple-200',
    interview: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    offered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hired: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    withdrawn: 'bg-slate-50 text-slate-600 border-slate-200',
    pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    active: 'bg-green-50 text-green-700 border-green-200',
    inactive: 'bg-slate-50 text-slate-600 border-slate-200',
    closed: 'bg-red-50 text-red-700 border-red-200',
  }
  return map[status] || 'bg-slate-50 text-slate-600 border-slate-200'
}

export const truncate = (str, maxLen = 100) => {
  if (!str) return ''
  return str.length > maxLen ? str.substring(0, maxLen) + '...' : str
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const pluralize = (count, singular, plural) => {
  return `${count} ${count === 1 ? singular : plural || singular + 's'}`
}

// Shared by the resume live-preview and the exported PDF so date ranges
// render identically in both places, using a plain ASCII hyphen only.
export const formatDateRange = (start, end, isCurrent) => {
  const parts = []
  if (start) parts.push(start)
  if (isCurrent) parts.push('Present')
  else if (end) parts.push(end)
  return parts.join(' - ')
}

// Prefixes a bare domain (e.g. "linkedin.com/in/x") with https:// so links
// are always valid/clickable, without forcing the user to type the scheme.
export const normalizeUrl = (url) => {
  const value = (url || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}
