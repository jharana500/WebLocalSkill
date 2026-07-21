import { CheckCircle2, Zap, Building2, Star, ArrowRight } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { cn } from '@/utils/cn'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 4999,
    annualPrice: 3999,
    description: 'Perfect for small businesses making their first hires.',
    icon: Zap,
    color: 'border-slate-200',
    features: [
      '3 active job posts',
      '50 candidate views/month',
      'Basic applicant tracking',
      'Standard company profile',
      'Email support',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthlyPrice: 12999,
    annualPrice: 9999,
    description: 'For growing teams with active hiring needs.',
    icon: Building2,
    color: 'border-blue-500',
    popular: true,
    features: [
      '10 active job posts',
      'Unlimited candidate views',
      'Advanced applicant tracking',
      'Priority listing placement',
      'Analytics dashboard',
      'Verified company badge',
      'Priority support',
    ],
    cta: 'Start Free Trial',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'Custom solutions for large organizations.',
    icon: Star,
    color: 'border-slate-200',
    features: [
      'Unlimited job posts',
      'Dedicated account manager',
      'Custom integrations (ATS/HRMS)',
      'Bulk candidate outreach',
      'Custom analytics reports',
      'SLA guarantees',
      'Onsite onboarding',
    ],
    cta: 'Contact Sales',
  },
]

export default function Pricing() {
  const navigate = useNavigate()
  const [annual, setAnnual] = useState(true)

  return (
    <div className="pt-16">
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-slate-400 text-lg mb-8">No hidden fees. No consultancy commissions. Pay only for what you need.</p>
          <div className="inline-flex items-center bg-slate-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all', !annual ? 'bg-white text-slate-900' : 'text-slate-400')}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn('px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2', annual ? 'bg-white text-slate-900' : 'text-slate-400')}
            >
              Annual
              <Badge variant="success" size="xs">Save 23%</Badge>
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 -mt-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon
            const price = annual ? plan.annualPrice : plan.monthlyPrice
            return (
              <div
                key={plan.id}
                className={cn(
                  'relative bg-white rounded-2xl border-2 p-8',
                  plan.popular ? 'border-blue-500 shadow-xl' : 'border-slate-200 shadow-sm'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge variant="primary" size="md">Most Popular</Badge>
                  </div>
                )}

                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5">
                  <Icon size={22} className="text-blue-600" />
                </div>

                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1 mb-6">{plan.description}</p>

                {price ? (
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">NPR {price.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm ml-1">/month</span>
                    {annual && <p className="text-xs text-emerald-600 mt-1">Billed annually</p>}
                  </div>
                ) : (
                  <div className="mb-6">
                    <span className="text-2xl font-bold text-slate-900">Custom Pricing</span>
                    <p className="text-xs text-slate-500 mt-1">Tailored to your needs</p>
                  </div>
                )}

                <Button
                  variant={plan.popular ? 'primary' : 'outline'}
                  size="md"
                  fullWidth
                  iconRight={ArrowRight}
                  onClick={() => plan.id === 'enterprise' ? navigate('/contact') : navigate('/register?plan=' + plan.id)}
                >
                  {plan.cta}
                </Button>

                <ul className="mt-6 space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      {/* Job Seeker section */}
      <section className="py-16 px-4 bg-blue-50 border-y border-blue-100 text-center">
        <div className="max-w-xl mx-auto">
          <Badge variant="primary" size="md" className="mb-4">For Job Seekers</Badge>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Always Free for Job Seekers</h2>
          <p className="text-slate-600 mb-6">
            LocalSkill will always be free for job seekers. Create a profile, apply to jobs, build your resume — all at zero cost.
          </p>
          <Button variant="primary" onClick={() => navigate('/register')}>Create Free Account</Button>
        </div>
      </section>
    </div>
  )
}
