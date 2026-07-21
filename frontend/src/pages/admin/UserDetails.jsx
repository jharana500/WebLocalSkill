import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Shield, UserX, UserCheck } from 'lucide-react'
import { Button, Badge, Alert } from '@/components/ui'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, formatRelativeTime } from '@/utils/formatters'
import { adminService } from '@/services/adminService'

const STATUS_CONFIG = {
  PENDING:    { label: 'Applied',     variant: 'primary' },
  REVIEWING:  { label: 'Reviewing',   variant: 'warning' },
  SHORTLISTED:{ label: 'Shortlisted', variant: 'success' },
  HIRED:      { label: 'Hired',       variant: 'purple' },
  REJECTED:   { label: 'Rejected',    variant: 'danger' },
  WITHDRAWN:  { label: 'Withdrawn',   variant: 'default' },
}

const ROLE_LABELS = { JOB_SEEKER: 'Job Seeker', COMPANY: 'Company', ADMIN: 'Admin' }

export default function UserDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminService.getUserById(id),
    staleTime: 1000 * 60 * 2,
  })

  const deactivateMutation = useMutation({
    mutationFn: () => adminService.deactivateUser(id),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'user', id]),
  })
  const activateMutation = useMutation({
    mutationFn: () => adminService.activateUser(id),
    onSuccess: () => queryClient.invalidateQueries(['admin', 'user', id]),
  })

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6 h-48" />
            <div className="bg-white border border-slate-200 rounded-xl h-40" />
          </div>
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-40" />
            <div className="bg-white border border-slate-200 rounded-xl p-5 h-40" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-red-600 font-medium mb-3">User not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const user = data?.user || data
  const profile = user?.profile
  const name = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || user.email
    : user?.company?.name || user?.email || 'Unknown'
  const skills = profile?.skills || []
  const applications = user?.applications || []

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt={name} className="w-14 h-14 rounded-full object-cover shrink-0" />
              ) : (
                <Avatar name={name} size="xl" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{name}</h2>
                  <Badge variant={user?.isActive ? 'success' : 'danger'} size="xs">
                    {user?.isActive ? 'Active' : 'Suspended'}
                  </Badge>
                  <Badge variant="primary" size="xs">{ROLE_LABELS[user?.role] || user?.role}</Badge>
                </div>
                {profile?.bio && <p className="text-slate-500 text-sm mt-1">{profile.bio}</p>}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><Mail size={12} /> {user?.email}</span>
                  {profile?.phone && <span className="flex items-center gap-1.5"><Phone size={12} /> {profile.phone}</span>}
                  {profile?.district && <span className="flex items-center gap-1.5"><MapPin size={12} /> {profile.district}</span>}
                  <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {formatDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>
            {skills.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-500 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {applications.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Applications ({applications.length})</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {applications.slice(0, 10).map(app => {
                  const s = STATUS_CONFIG[app.status] || STATUS_CONFIG.PENDING
                  return (
                    <div key={app.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{app.job?.title}</p>
                        <p className="text-xs text-slate-500">{app.job?.company?.name} · {formatDate(app.createdAt)}</p>
                      </div>
                      <Badge variant={s.variant} size="xs">{s.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Admin Actions</h3>
            <div className="space-y-2">
              {user?.isActive ? (
                <Button
                  variant="outline-danger"
                  size="sm"
                  fullWidth
                  icon={UserX}
                  onClick={() => deactivateMutation.mutate()}
                  disabled={deactivateMutation.isPending}
                >
                  Suspend Account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={UserCheck}
                  onClick={() => activateMutation.mutate()}
                  disabled={activateMutation.isPending}
                >
                  Restore Account
                </Button>
              )}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Account Details</h3>
            <div className="space-y-3">
              {[
                { label: 'User ID', value: user?.id?.slice(0, 8) + '...' },
                { label: 'Role', value: ROLE_LABELS[user?.role] || user?.role },
                { label: 'Registered', value: formatDate(user?.createdAt) },
                { label: 'Status', value: user?.isActive ? 'Active' : 'Suspended' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-medium text-slate-900 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
