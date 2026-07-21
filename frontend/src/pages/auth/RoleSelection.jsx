import { useNavigate } from 'react-router-dom'
import { Briefcase, Building2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/ui'

const roles = [
  {
    id: 'job_seeker',
    icon: Briefcase,
    title: 'Job Seeker',
    subtitle: "I'm looking for a job",
    description: 'Browse thousands of verified job listings, apply directly to companies, and track your applications.',
    perks: ['Free forever', 'Direct company contact', 'Resume builder', 'Application tracking'],
    color: 'border-blue-200 bg-blue-50/50',
    activeColor: 'border-blue-600 bg-blue-50',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'company',
    icon: Building2,
    title: 'Company / Recruiter',
    subtitle: "I'm hiring talent",
    description: 'Post jobs, manage applicants, and hire Nepal\'s best talent without consultancy fees.',
    perks: ['14-day free trial', 'Verified company badge', 'Applicant tracking', 'Analytics dashboard'],
    color: 'border-slate-200 bg-white',
    activeColor: 'border-indigo-600 bg-indigo-50/30',
    iconBg: 'bg-indigo-100 text-indigo-700',
  },
]

export default function RoleSelection() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Join LocalSkill</h1>
        <p className="text-slate-500 mt-2 text-sm">How would you like to use LocalSkill?</p>
      </div>

      <div className="space-y-4 mb-8">
        {roles.map(({ id, icon: Icon, title, subtitle, description, perks, color, activeColor, iconBg }) => (
          <button
            key={id}
            onClick={() => setSelected(id)}
            className={cn(
              'w-full text-left rounded-2xl border-2 p-5 transition-all duration-200',
              selected === id ? activeColor : color,
              'hover:shadow-sm'
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0',
                    selected === id ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  )}>
                    {selected === id && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {perks.map(p => (
                    <span key={p} className="flex items-center gap-1 text-xs text-slate-600">
                      <CheckCircle2 size={11} className="text-emerald-500" /> {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        fullWidth
        disabled={!selected}
        iconRight={ArrowRight}
        onClick={() => navigate(`/register?role=${selected}`)}
      >
        Continue as {selected === 'job_seeker' ? 'Job Seeker' : selected === 'company' ? 'Company' : '...'}
      </Button>

      <p className="text-center text-sm text-slate-500 mt-6">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-blue-600 font-medium hover:underline">Sign in</button>
      </p>
    </div>
  )
}
