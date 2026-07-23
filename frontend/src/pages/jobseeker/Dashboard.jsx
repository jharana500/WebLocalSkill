import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Briefcase, BookmarkIcon, FileText, TrendingUp, MapPin,
  Clock, ArrowRight, Search, Bell, Star
} from 'lucide-react'
import { KPIWidget, Badge, VerifiedBadge } from '@/components/ui'
import { Button } from '@/components/ui'
import useAuthStore from '@/store/authStore'
import { formatRelativeTime } from '@/utils/formatters'
import { cn } from '@/utils/cn'
import { userService } from '@/services/userService'

const statusConfig = {
  PENDING:    { label: 'Applied',       class: 'bg-blue-50 text-blue-700 border-blue-200' },
  REVIEWING:  { label: 'Under Review',  class: 'bg-amber-50 text-amber-700 border-amber-200' },
  SHORTLISTED:{ label: 'Shortlisted',   class: 'bg-purple-50 text-purple-700 border-purple-200' },
  HIRED:      { label: 'Hired',         class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:   { label: 'Rejected',      class: 'bg-red-50 text-red-700 border-red-200' },
  WITHDRAWN:  { label: 'Withdrawn',     class: 'bg-slate-50 text-slate-500 border-slate-200' },
}

function JobCard({ job }) {
  const navigate = useNavigate()
  const company = job.company
  const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'

  return (
    <div
      onClick={() => navigate(`/dashboard/jobs/${job.id}`)}
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-200"
    >
      {company?.logoUrl ? (
        <img src={company.logoUrl} alt={company.name} className="w-11 h-11 rounded-xl object-cover border border-slate-100 shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{job.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-slate-500">{company?.name}</span>
              {company?.isVerified && <VerifiedBadge size="xs" />}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant="primary" size="xs">{job.jobType?.replace('_', ' ')}</Badge>
          {job.district && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={10} /> {job.district}
            </span>
          )}
          {job.salary && <span className="text-xs font-medium text-slate-700">{job.salary}</span>}
        </div>
      </div>
    </div>
  )
}

function ProfileCompletion({ percentage = 0 }) {
  const steps = [
    { label: 'Basic Info',  done: percentage >= 20 },
    { label: 'Photo',       done: percentage >= 30 },
    { label: 'Experience',  done: percentage >= 50 },
    { label: 'Education',   done: percentage >= 60 },
    { label: 'Skills',      done: percentage >= 80 },
    { label: 'Resume',      done: percentage >= 90 },
  ]
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Profile Strength</h3>
        <span className="text-sm font-bold text-blue-700">{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${percentage}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {steps.map(({ label, done }) => (
          <div key={label} className={cn('flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg', done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500')}>
            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', done ? 'bg-emerald-500' : 'bg-slate-300')} />
            {label}
          </div>
        ))}
      </div>
      {percentage < 100 && (
        <p className="text-xs text-slate-500 mt-3">Complete your profile to get more matches</p>
      )}
    </div>
  )
}

export default function JobSeekerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data, isLoading } = useQuery({
    queryKey: ['user', 'dashboard'],
    queryFn: userService.getDashboardData,
    staleTime: 1000 * 60 * 2,
  })

  const stats = data?.stats ?? {}
  const recommendedJobs = data?.recommendedJobs ?? []
  const recentApplications = data?.recentApplications ?? []

  const firstName = user?.fullName?.split(' ')[0] || 'there'

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <p className="text-slate-500 text-sm">{greeting}</p>
        <h1 className="text-2xl font-bold text-slate-900">{firstName} 👋</h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's happening with your job search</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)
        ) : (
          <>
            <KPIWidget title="Applications" value={stats.totalApplications?.toLocaleString() ?? '0'} change={0} changeLabel="this month" icon={FileText} color="blue" />
            <KPIWidget title="Saved Jobs" value={stats.savedJobs?.toLocaleString() ?? '0'} change={0} changeLabel="total saved" icon={BookmarkIcon} color="purple" />
            <KPIWidget title="Shortlisted" value={stats.shortlisted?.toLocaleString() ?? '0'} change={0} changeLabel="total" icon={TrendingUp} color="emerald" />
            <KPIWidget title="Profile" value={`${stats.profileCompletion ?? 0}%`} change={0} changeLabel="complete" icon={Briefcase} color="amber" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recommended Jobs */}
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Star size={16} className="text-amber-500" />
                <h2 className="text-base font-semibold text-slate-900">Recommended for You</h2>
                {!isLoading && <Badge variant="primary" size="xs">{recommendedJobs.length}</Badge>}
              </div>
              <button onClick={() => navigate('/dashboard/find-jobs')} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 animate-pulse">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-slate-50 rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : recommendedJobs.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No recommendations yet. Complete your profile to get matches.</div>
              ) : (
                recommendedJobs.slice(0, 5).map(job => <JobCard key={job.id} job={job} />)
              )}
            </div>
          </div>

          {/* Recent Applications */}
          <div className="bg-white border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Recent Applications</h2>
              <button onClick={() => navigate('/dashboard/applications')} className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                    <div className="flex-1">
                      <div className="h-4 bg-slate-100 rounded w-1/2 mb-1" />
                      <div className="h-3 bg-slate-50 rounded w-1/3" />
                    </div>
                  </div>
                ))
              ) : recentApplications.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">No applications yet. Start applying to jobs!</div>
              ) : recentApplications.map(app => {
                const s = statusConfig[app.status] || statusConfig.PENDING
                const company = app.job?.company
                const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'
                return (
                  <div
                    key={app.id}
                    onClick={() => navigate(`/dashboard/applications/${app.id}`)}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {company?.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{app.job?.title}</p>
                      <p className="text-xs text-slate-500">{company?.name}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', s.class)}>{s.label}</span>
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

        {/* Right Sidebar */}
        <div className="space-y-5">
          <ProfileCompletion percentage={stats.profileCompletion ?? 0} />

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { icon: Search, label: 'Browse Jobs', href: '/dashboard/find-jobs', color: 'text-blue-600 bg-blue-50' },
                { icon: FileText, label: 'Update Resume', href: '/dashboard/resume', color: 'text-purple-600 bg-purple-50' },
                { icon: Bell, label: 'Job Alerts', href: '/dashboard/settings', color: 'text-amber-600 bg-amber-50' },
              ].map(({ icon: Icon, label, href, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(href)}
                  className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', color)}>
                    <Icon size={15} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
                  <ArrowRight size={13} className="ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-5 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Bell size={16} />
              <p className="text-sm font-semibold">Set Up Job Alerts</p>
            </div>
            <p className="text-xs text-blue-200 mb-4 leading-relaxed">
              Get notified instantly when jobs matching your profile are posted
            </p>
            <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/settings')} className="bg-white/20 text-white border-white/20 hover:bg-white/30">
              Configure Alerts
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
