import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Search, Bookmark, FileText, FileUser,
  MessageSquare, User, Settings, Briefcase, Bell, Menu,
  X, ChevronLeft, LogOut, ChevronRight
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Avatar, Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui'
import useAuthStore from '@/store/authStore'
import { useLogout } from '@/hooks/useAuth'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Search, label: 'Find Jobs', href: '/dashboard/find-jobs' },
  { icon: Bookmark, label: 'Saved Jobs', href: '/dashboard/saved-jobs' },
  { icon: FileText, label: 'Applications', href: '/dashboard/applications' },
  { icon: FileUser, label: 'Resume Builder', href: '/dashboard/resume' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages' },
  { icon: User, label: 'Profile', href: '/dashboard/profile' },
  { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
]

function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuthStore()
  const logout = useLogout()

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
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, href }) => (
            <NavLink
              key={href}
              to={href}
              end={href === '/dashboard'}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg font-medium text-sm transition-all duration-150',
                  collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className={cn('border-t border-slate-100 p-3', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
        ) : (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group">
            <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.fullName || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
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
      <button
        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
        onClick={onMobileMenuOpen}
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 max-w-md hidden md:block" />

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full" />
        </button>

        <Dropdown
          align="right"
          trigger={
            <button className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors">
              <Avatar src={user?.avatarUrl} name={user?.fullName} size="sm" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-900 leading-tight">{user?.fullName || 'User'}</p>
                <p className="text-xs text-slate-500 leading-tight">Job Seeker</p>
              </div>
            </button>
          }
        >
          <DropdownItem icon={User} onClick={() => navigate('/dashboard/profile')}>My Profile</DropdownItem>
          <DropdownItem icon={Settings} onClick={() => navigate('/dashboard/settings')}>Settings</DropdownItem>
          <DropdownSeparator />
          <DropdownItem icon={LogOut} danger onClick={logout}>Sign Out</DropdownItem>
        </Dropdown>
      </div>
    </header>
  )
}

function MobileMenu({ open, onClose }) {
  const { user } = useAuthStore()
  const logout = useLogout()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-right">
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase size={14} className="text-white" />
            </div>
            <span className="font-bold text-slate-900">LocalSkill</span>
          </Link>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {navItems.map(({ icon: Icon, label, href }) => (
            <NavLink
              key={href}
              to={href}
              onClick={onClose}
              end={href === '/dashboard'}
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
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={user?.avatarUrl} name={user?.fullName} size="md" />
            <div>
              <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); onClose() }}
            className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium"
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function JobSeekerLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
