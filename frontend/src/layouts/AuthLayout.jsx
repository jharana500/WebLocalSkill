import { Link, Outlet } from 'react-router-dom'
import { Briefcase } from 'lucide-react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 w-fit">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">LocalSkill</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </div>

      <footer className="px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-200">
        © {new Date().getFullYear()} LocalSkill. All rights reserved. &nbsp;·&nbsp;
        <a href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</a>
        &nbsp;·&nbsp;
        <a href="/terms" className="hover:text-slate-600 transition-colors">Terms</a>
      </footer>
    </div>
  )
}
