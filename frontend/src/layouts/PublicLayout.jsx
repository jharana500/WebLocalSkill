import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Menu, X, ChevronDown, Briefcase, Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui'
import useAuthStore from '@/store/authStore'
import { getRoleDashboardPath } from '@/utils/roles'
import { Outlet } from 'react-router-dom'

const navLinks = [
  { label: 'Find Jobs', href: '/jobs' },
  { label: 'Companies', href: '/companies' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
]

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const getDashboardPath = () => getRoleDashboardPath(user?.role) || '/dashboard'

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-200',
        scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">LocalSkill</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button variant="primary" size="sm" onClick={() => navigate(getDashboardPath())}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>Get Started</Button>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex flex-col gap-2 border-t border-slate-100 mt-3">
            {isAuthenticated ? (
              <Button variant="primary" fullWidth onClick={() => { navigate(getDashboardPath()); setMobileOpen(false) }}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" fullWidth onClick={() => { navigate('/login'); setMobileOpen(false) }}>Sign In</Button>
                <Button variant="primary" fullWidth onClick={() => { navigate('/register'); setMobileOpen(false) }}>Get Started</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

const FOOTER_COLUMNS = [
  {
    title: 'For Job Seekers',
    links: [
      { label: 'Find Jobs', to: '/jobs' },
      { label: 'Companies', to: '/companies' },
      { label: 'Resume Builder', to: '/dashboard/resume' },
      { label: 'Help Centre', to: '/faq' },
    ],
  },
  {
    title: 'For Companies',
    links: [
      { label: 'Post a Job', to: '/register' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Applicant Tracking', to: '/pricing' },
      { label: 'Get Verified', to: '/register' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
    ],
  },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Cookie Policy', to: '/privacy' },
]

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Briefcase size={16} className="text-white" />
              </div>
              <span className="font-bold text-lg text-white">LocalSkill</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Nepal's premier hiring platform. Connect directly with verified companies. No middlemen.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="text-sm hover:text-white transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© {new Date().getFullYear()} LocalSkill Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            {LEGAL_LINKS.map((link) => (
              <Link key={link.label} to={link.to} className="hover:text-white transition-colors">{link.label}</Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
