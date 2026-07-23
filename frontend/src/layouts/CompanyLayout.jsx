import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, ShieldCheck, Plus, Briefcase, Users,
  Building2, BarChart2, CreditCard, Settings, Menu, X,
  ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar, Badge, Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui'
import { NotificationBell } from '@/components/layout/NotificationBell'
import useAuthStore from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'

const VERIFICATION_BADGE = {
  PENDING: { variant: 'warning', label: 'Pending' },
  UNDER_REVIEW: { variant: 'primary', label: 'Under Review' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  DUPLICATE: { variant: 'danger', label: 'Duplicate' },
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/company/dashboard' },
  { icon: ShieldCheck, label: 'Verification', href: '/company/verification' },
  { icon: Plus, label: 'Post a Job', href: '/company/post-job' },
  { icon: Briefcase, label: 'Manage Jobs', href: '/company/jobs' },
  { icon: Users, label: 'Applicants', href: '/company/applicants' },
  { icon: Building2, label: 'Company Profile', href: '/company/profile' },
  { icon: BarChart2, label: 'Analytics', href: '/company/analytics' },
  { icon: CreditCard, label: 'Billing', href: '/company/billing' },
  { icon: Settings, label: 'Settings', href: '/company/settings' },
]

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuthStore()
  const logout = useLogout()
  const verificationStatus = user?.company?.verification?.status || 'PENDING'
  const verificationBadge = user?.company?.isVerified
    ? { variant: 'success', label: 'Verified' }
    : VERIFICATION_BADGE[verificationStatus] || VERIFICATION_BADGE.PENDING

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className={cn('flex items-center border-b border-slate-100 h-16', collapsed ? 'justify-center px-3' : 'px-5 justify-between')}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={14} className="text-white" />
            </div>
            <span className="font-bold text-base text-slate-900">LocalSkill</span>
          </Link>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Avatar src={user?.company?.logoUrl} name={user?.company?.name || user?.fullName} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.company?.name || 'Your Company'}</p>
              <Badge variant={verificationBadge.variant} size="xs">
                {verificationBadge.label}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg font-medium text-sm transition-all duration-150',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={17} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className={cn('border-t border-slate-100 p-3', collapsed && 'flex justify-center')}>
        {!collapsed && (
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full p-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </aside>
  )
}

function TopBar({ onMobileMenuOpen }) {
  const { user } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100" onClick={onMobileMenuOpen}>
        <Menu size={20} />
      </button>

      <div className="flex-1 hidden md:block" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <Avatar src={user?.company?.logoUrl} name={user?.company?.name || user?.fullName} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">{user?.company?.name || 'Company'}</p>
                <p className="text-xs text-slate-500 leading-tight">Recruiter</p>
              </div>
            </button>
          }
        >
          <DropdownItem icon={Building2} onClick={() => navigate('/company/profile')}>Company Profile</DropdownItem>
          <DropdownItem icon={Settings} onClick={() => navigate('/company/settings')}>Settings</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={LogOut} danger onClick={logout}>Sign Out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}

export default function CompanyLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl animate-slide-right">
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
              <span className="font-bold text-slate-900">LocalSkill</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <nav className="py-4 px-3 space-y-0.5">
              {navItems.map(({ icon: Icon, label, href }) => (
                <NavLink
                  key={href}
                  to={href}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    )
                  }
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
