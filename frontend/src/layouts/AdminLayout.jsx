import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Users, Building2, Briefcase, FileText,
  ShieldCheck, BarChart2, TrendingUp, Settings,
  Menu, X, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar, Badge, Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { adminService } from '@/services/adminService'
import useAuthStore from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: Users, label: 'Users', href: '/admin/users' },
      { icon: Building2, label: 'Companies', href: '/admin/companies' },
      { icon: Briefcase, label: 'Jobs', href: '/admin/jobs' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: ShieldCheck, label: 'Verification Queue', href: '/admin/verification' },
      { icon: FileText, label: 'Reports', href: '/admin/reports' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics' },
      { icon: BarChart2, label: 'Revenue', href: '/admin/revenue' },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Settings, label: 'Settings', href: '/admin/settings' },
    ],
  },
]

function Sidebar({ collapsed, onToggle, badgeCounts }) {
  const { user } = useAuthStore()
  const logout = useLogout()

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col bg-slate-900 transition-all duration-300 shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn('flex items-center h-16 border-b border-slate-800', collapsed ? 'justify-center px-3' : 'px-5 justify-between')}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Briefcase size={14} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-tight">LocalSkill</p>
              <p className="text-xs text-slate-400 leading-tight">Admin Portal</p>
            </div>
          </Link>
        )}
        <button onClick={onToggle} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ icon: Icon, label, href }) => {
                const badge = badgeCounts?.[href]
                return (
                  <NavLink
                    key={href}
                    to={href}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-lg font-medium text-sm transition-all duration-150',
                        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      )
                    }
                    title={collapsed ? label : undefined}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{label}</span>
                        {Boolean(badge) && (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-slate-800 p-3', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer group">
            <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.fullName || 'Admin'}</p>
              <p className="text-xs text-slate-500 truncate">Administrator</p>
            </div>
            <button onClick={logout} className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-400 transition-all">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
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

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100">
              <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">{user?.fullName || 'Admin'}</p>
                <p className="text-xs text-slate-500 leading-tight">Administrator</p>
              </div>
            </button>
          }
        >
          <DropdownItem icon={Settings} onClick={() => navigate('/admin/settings')}>Settings</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={LogOut} danger onClick={logout}>Sign Out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { data: dashboardData } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: adminService.getDashboardStats,
    staleTime: 1000 * 60,
    refetchInterval: 60 * 1000,
  })
  const badgeCounts = {
    '/admin/verification': dashboardData?.stats?.pendingVerifications ?? 0,
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} badgeCounts={badgeCounts} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 shadow-2xl animate-slide-right overflow-y-auto">
            <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
              <span className="font-bold text-white">Admin Portal</span>
              <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <nav className="py-4 px-2">
              {navGroups.map((group) => (
                <div key={group.label} className="mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 px-3 mb-1.5">{group.label}</p>
                  {group.items.map(({ icon: Icon, label, href }) => {
                    const badge = badgeCounts[href]
                    return (
                      <NavLink
                        key={href}
                        to={href}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors',
                            isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          )
                        }
                      >
                        <Icon size={16} />
                        <span className="flex-1">{label}</span>
                        {Boolean(badge) && (
                          <span className="h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </NavLink>
                    )
                  })}
                </div>
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
