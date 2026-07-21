import { ShieldCheck, Users, Target, Award, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui'
import { useNavigate } from 'react-router-dom'

const values = [
  { icon: ShieldCheck, title: 'Trust & Verification', desc: 'Every company is verified with government registration, PAN/VAT, and compliance checks before listing.' },
  { icon: Users, title: 'Direct Connections', desc: 'We eliminate recruiters and middlemen so job seekers connect directly with hiring managers.' },
  { icon: Target, title: 'Precision Matching', desc: 'Our algorithm matches candidates to roles based on skills, experience, and career goals.' },
  { icon: Award, title: 'Quality Over Quantity', desc: 'We maintain high standards for both job listings and candidate profiles to ensure the best outcomes.' },
]

const team = [
  { name: 'Aarav Sharma', role: 'CEO & Co-founder', initials: 'AS' },
  { name: 'Priya Thapa', role: 'CTO & Co-founder', initials: 'PT' },
  { name: 'Rajan Shrestha', role: 'Head of Product', initials: 'RS' },
  { name: 'Sita Gurung', role: 'Head of Operations', initials: 'SG' },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="bg-slate-900 px-4 py-24 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-4 py-2 rounded-full mb-8">
            <Briefcase size={14} /> Our Mission
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            Building Nepal's Most Trusted Hiring Platform
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            LocalSkill was born from a simple frustration: Nepal's job market was dominated by middlemen
            who took commissions while adding no real value. We built the platform we wished existed.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">The Problem We're Solving</h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>Nepal's job market has long been plagued by recruitment consultancies that charge fees from both employers and candidates, creating unnecessary friction and driving up costs.</p>
                <p>Job seekers often apply through layers of intermediaries who have no skin in the game. Companies spend months finding the right candidates while consultancies take commissions without accountability.</p>
                <p>LocalSkill changes this. We provide a direct line between verified employers and qualified candidates — transparent, fast, and free from middlemen.</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8">
              <div className="space-y-6">
                {[
                  { label: 'Founded', value: '2024' },
                  { label: 'Headquarters', value: 'Kathmandu, Nepal' },
                  { label: 'Team Size', value: '25+ people' },
                  { label: 'Users', value: '12,000+ job seekers' },
                  { label: 'Verified Companies', value: '800+' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-blue-100 last:border-0">
                    <span className="text-sm font-medium text-slate-500">{label}</span>
                    <span className="text-sm font-bold text-slate-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Our Core Values</h2>
            <p className="text-slate-500 max-w-lg mx-auto">The principles that guide every decision we make</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={22} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Meet the Team</h2>
            <p className="text-slate-500">Passionate builders committed to transforming Nepal's job market</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map(({ name, role, initials }) => (
              <div key={name} className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl mx-auto mb-4">
                  {initials}
                </div>
                <p className="font-semibold text-slate-900">{name}</p>
                <p className="text-sm text-slate-500 mt-0.5">{role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-slate-50 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to Join Us?</h2>
          <p className="text-slate-500 mb-8">Whether you're a job seeker or a company, LocalSkill is your home.</p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={() => navigate('/register')}>Get Started</Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/contact')}>Contact Us</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
