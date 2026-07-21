import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight, Briefcase, Building2, MapPin, ShieldCheck, Star,
  Users, TrendingUp, CheckCircle2, ChevronRight, Search,
  Zap, Globe, Award, Clock
} from 'lucide-react'
import { Button, Badge, VerifiedBadge } from '@/components/ui'
import { HeroSearchBar } from '@/components/ui/SearchBar'
import { formatRelativeTime } from '@/utils/formatters'
import { jobService } from '@/services/jobService'
import { companyService } from '@/services/companyService'

const CATEGORY_META = {
  'Technology & IT':  { icon: '💻', color: 'bg-blue-50 border-blue-100' },
  'Finance & Banking':{ icon: '💰', color: 'bg-emerald-50 border-emerald-100' },
  'Design & Creative':{ icon: '🎨', color: 'bg-purple-50 border-purple-100' },
  'Marketing':        { icon: '📣', color: 'bg-amber-50 border-amber-100' },
  'Engineering':      { icon: '⚙️', color: 'bg-rose-50 border-rose-100' },
  'Healthcare':       { icon: '🏥', color: 'bg-teal-50 border-teal-100' },
  'Operations':       { icon: '🔧', color: 'bg-indigo-50 border-indigo-100' },
  'Education':        { icon: '📚', color: 'bg-orange-50 border-orange-100' },
}

const steps = [
  { step: '01', title: 'Create Your Profile', desc: 'Build a comprehensive profile with your skills, experience, and portfolio to stand out.', icon: Users },
  { step: '02', title: 'Discover Opportunities', desc: 'Browse thousands of verified jobs from top companies. Filter by role, salary, and location.', icon: Search },
  { step: '03', title: 'Apply Directly', desc: 'Apply with a single click directly to verified companies — no recruiters, no middlemen.', icon: Zap },
  { step: '04', title: 'Get Hired', desc: "Track your applications in real time and get hired at Nepal's best companies.", icon: Award },
]

const testimonials = [
  { name: 'Priya Sharma', role: 'Software Engineer at Leapfrog', text: 'LocalSkill completely changed how I find work. I got 3 interview calls in my first week without going through any middleman.', rating: 5 },
  { name: 'Rohan Thapa', role: 'Product Manager at Fusemachines', text: 'The verification system gives me confidence that every job I apply to is legitimate. The platform feels premium and professional.', rating: 5 },
  { name: 'Sushma Gurung', role: 'UI Designer at Tootle', text: 'Finally, a Nepali job portal that looks and feels world-class. Got my dream job in 2 weeks. Highly recommend.', rating: 5 },
]

function JobCard({ job }) {
  const navigate = useNavigate()
  const company = job.company
  const initials = company?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'

  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {company?.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-base group-hover:text-blue-700 transition-colors leading-tight">{job.title}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-sm text-slate-600 font-medium">{company?.name}</span>
            {company?.isVerified && <VerifiedBadge size="xs" />}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <Badge variant="primary" size="sm">{job.jobType?.replace('_', ' ')}</Badge>
        {job.district && (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin size={11} /> {job.district}
          </span>
        )}
        <span className="text-xs text-slate-400">·</span>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Clock size={11} /> {formatRelativeTime(job.createdAt)}
        </span>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-sm font-semibold text-slate-900">{job.salary || 'Salary negotiable'}</span>
        <span className="text-xs font-medium text-blue-600 group-hover:underline">View Details →</span>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()

  const { data: jobsData } = useQuery({
    queryKey: ['jobs', 'featured'],
    queryFn: jobService.getFeaturedJobs,
    staleTime: 1000 * 60 * 10,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['jobs', 'categories'],
    queryFn: jobService.getCategories,
    staleTime: 1000 * 60 * 10,
  })

  const { data: companiesData } = useQuery({
    queryKey: ['companies', 'public'],
    queryFn: () => companyService.getPublicCompanies({ limit: 8 }),
    staleTime: 1000 * 60 * 10,
  })

  const featuredJobs = jobsData?.jobs ?? []
  const categories = categoriesData?.categories ?? []
  const verifiedCompanies = companiesData?.companies ?? []

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-slate-900 pt-24 pb-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-3xl opacity-20" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full filter blur-3xl opacity-20" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <ShieldCheck size={14} />
            Nepal's first verified hiring platform
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6">
            Find Jobs Directly From<br />
            <span className="text-blue-400">Verified Companies</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            No middlemen. No consultancies. Connect directly with Nepal's top companies and get hired faster than ever before.
          </p>
          <HeroSearchBar onSearch={(q, l) => navigate(`/jobs?q=${q}&location=${l}`)} className="max-w-3xl mx-auto" />
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 text-sm text-slate-500">
            <span>Popular:</span>
            {['React Developer', 'Product Manager', 'Data Scientist', 'UI Designer'].map(t => (
              <Link key={t} to={`/jobs?q=${t}`} className="text-slate-400 hover:text-blue-400 transition-colors">{t}</Link>
            ))}
          </div>
        </div>

        {/* Platform stats from live data */}
        <div className="max-w-5xl mx-auto mt-20 grid grid-cols-2 lg:grid-cols-4 gap-4 relative">
          {[
            { value: featuredJobs.length > 0 ? `${featuredJobs.length}+` : '—', label: 'Featured Jobs', icon: Briefcase },
            { value: verifiedCompanies.length > 0 ? `${verifiedCompanies.length}+` : '—', label: 'Verified Companies', icon: Building2 },
            { value: categories.length > 0 ? `${categories.length}+` : '—', label: 'Job Categories', icon: TrendingUp },
            { value: '100%', label: 'Verified Listings', icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">{value}</p>
              <p className="text-sm text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Jobs */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Latest Opportunities</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Featured Jobs</h2>
              <p className="text-slate-500 mt-2">Handpicked roles from Nepal's top verified companies</p>
            </div>
            <Button variant="outline" iconRight={ChevronRight} onClick={() => navigate('/jobs')}>View all jobs</Button>
          </div>
          {featuredJobs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Briefcase size={40} className="mx-auto mb-4 text-slate-300" />
              <p>No jobs posted yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredJobs.map(job => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Browse by Role</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Popular Categories</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">Explore jobs across Nepal's fastest-growing industries</p>
          </div>
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Categories will appear once jobs are posted.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.slice(0, 8).map(({ name, count }) => {
                const meta = CATEGORY_META[name] || { icon: '📋', color: 'bg-slate-50 border-slate-100' }
                return (
                  <Link
                    key={name}
                    to={`/jobs?category=${encodeURIComponent(name)}`}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border hover:shadow-md transition-all duration-200 group ${meta.color}`}
                  >
                    <span className="text-3xl">{meta.icon}</span>
                    <div className="text-center">
                      <p className="font-semibold text-slate-900 text-sm">{name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{count} jobs open</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Simple Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">How It Works</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">Get hired in 4 simple steps — no consultancy fees, no middlemen</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-slate-200 z-0 -translate-x-6" />
                )}
                <div className="relative z-10 bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 tracking-wider">{step}</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Companies */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Trusted Partners</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Verified Companies Hiring Now</h2>
            <p className="text-slate-500 mt-2 max-w-lg mx-auto">Every company on LocalSkill is verified with government registration</p>
          </div>
          {verifiedCompanies.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Verified companies will appear here once they join.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
              {verifiedCompanies.map(company => {
                const initials = company.name.split(' ').map(w => w[0]).join('').slice(0, 2)
                return (
                  <div
                    key={company.id}
                    onClick={() => navigate(`/companies/${company.id}`)}
                    className="flex flex-col items-center gap-3 p-5 bg-slate-50 border border-slate-200 rounded-2xl hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-blue-700 font-bold text-lg">
                        {initials}
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <ShieldCheck size={11} className="text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">Verified</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="text-center">
            <Button variant="outline" iconRight={ChevronRight} onClick={() => navigate('/companies')}>View all companies</Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Success Stories</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">What Our Users Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(({ name, role, text, rating }) => {
              const initials = name.split(' ').map(w => w[0]).join('')
              return (
                <div key={name} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: rating }).map((_, i) => <Star key={i} size={14} className="fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed mb-6">"{text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{initials}</div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full filter blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Find Your Dream Job?</h2>
              <p className="text-blue-100 mb-8 max-w-xl mx-auto">
                Join thousands of job seekers who found their ideal role directly through verified companies on LocalSkill.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="secondary" size="lg" iconRight={ArrowRight} onClick={() => navigate('/register')} className="bg-white text-blue-700 hover:bg-blue-50">
                  Get Started Free
                </Button>
                <Button variant="ghost" size="lg" onClick={() => navigate('/jobs')} className="text-white hover:bg-white/10">
                  Browse Jobs
                </Button>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-blue-200">
                {['Free to use', 'No recruiters', 'Verified companies'].map(f => (
                  <span key={f} className="flex items-center gap-1.5"><CheckCircle2 size={14} /> {f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* App Banner */}
      <section className="py-16 px-4 bg-slate-900">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <Badge variant="primary" size="md" className="mb-4 bg-blue-600/20 text-blue-300 border-blue-500/30">Coming Soon</Badge>
            <h2 className="text-3xl font-bold text-white mb-4">LocalSkill on Your Phone</h2>
            <p className="text-slate-400 mb-8 max-w-md">Apply to jobs, track applications, and get notified instantly — all from your pocket.</p>
            <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
              <button className="flex items-center gap-3 bg-white text-slate-900 rounded-xl px-5 py-3 font-medium text-sm hover:bg-slate-100 transition-colors">
                <Globe size={18} /> App Store
              </button>
              <button className="flex items-center gap-3 bg-white text-slate-900 rounded-xl px-5 py-3 font-medium text-sm hover:bg-slate-100 transition-colors">
                <Globe size={18} /> Google Play
              </button>
            </div>
          </div>
          <div className="w-64 h-64 bg-slate-800 rounded-3xl border border-slate-700 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <Briefcase size={48} className="mx-auto mb-3 text-blue-600" />
              <p className="text-sm font-medium text-slate-400">App Preview</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
