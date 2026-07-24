import { ShieldCheck } from 'lucide-react'

const sections = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly — such as your name, email, phone number, resume details, and company information — along with usage data like pages visited and job searches performed, so we can operate and improve LocalSkill.',
  },
  {
    title: 'How We Use Your Information',
    body: 'We use your information to create and manage your account, match job seekers with relevant listings, verify companies, process applications, send service-related notifications, and improve the platform.',
  },
  {
    title: 'Sharing Your Information',
    body: 'We share job seeker profile and application details with the specific companies you apply to. We do not sell your personal information to third parties. Service providers who help us operate the platform (such as hosting and email delivery) may process data on our behalf under confidentiality obligations.',
  },
  {
    title: 'Cookies',
    body: 'LocalSkill uses cookies and similar technologies to keep you signed in, remember your preferences, and understand how the platform is used. You can control cookies through your browser settings.',
  },
  {
    title: 'Data Security',
    body: 'We use industry-standard measures, including encrypted password storage and access controls, to protect your information. No method of transmission or storage is 100% secure, but we work to safeguard your data.',
  },
  {
    title: 'Your Rights',
    body: 'You may access, update, or delete your account information at any time from your account settings, or by contacting us directly.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy, reach out via our Contact page.',
  },
]

export default function Privacy() {
  return (
    <div className="pt-16">
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-4 py-2 rounded-full mb-6">
            <ShieldCheck size={14} /> Privacy Policy
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Your Privacy Matters</h1>
          <p className="text-slate-400">How LocalSkill collects, uses, and protects your information.</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto space-y-10">
          <p className="text-sm text-slate-500">Last updated: January 2026</p>
          {sections.map(({ title, body }) => (
            <div key={title}>
              <h2 className="text-xl font-bold text-slate-900 mb-3">{title}</h2>
              <p className="text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
