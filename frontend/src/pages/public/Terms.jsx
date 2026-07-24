import { FileText } from 'lucide-react'

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By creating an account or using LocalSkill, you agree to these Terms of Service. If you do not agree, please do not use the platform.',
  },
  {
    title: 'Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when registering as a job seeker or a company.',
  },
  {
    title: 'Job Postings and Applications',
    body: 'Companies are responsible for the accuracy of their job postings and must comply with applicable labor laws. Job seekers are responsible for the accuracy of the information and resumes they submit. LocalSkill does not guarantee employment outcomes.',
  },
  {
    title: 'Company Verification',
    body: 'Companies may be required to submit registration and tax documents for verification. LocalSkill reserves the right to approve, reject, or revoke verification status at its discretion.',
  },
  {
    title: 'Subscriptions and Billing',
    body: 'Paid company plans are billed according to the plan selected at checkout. Prices are shown in NPR and are subject to change with notice. Cancelling a subscription stops future billing but does not refund the current billing period unless required by law.',
  },
  {
    title: 'Prohibited Conduct',
    body: 'You may not use LocalSkill to post fraudulent listings, misrepresent your identity or company, scrape the platform, or violate any applicable law.',
  },
  {
    title: 'Termination',
    body: 'We may suspend or terminate accounts that violate these terms or misuse the platform.',
  },
  {
    title: 'Limitation of Liability',
    body: 'LocalSkill is provided "as is". We are not liable for indirect or consequential damages arising from your use of the platform, to the fullest extent permitted by law.',
  },
  {
    title: 'Contact Us',
    body: 'Questions about these Terms can be sent to us via our Contact page.',
  },
]

export default function Terms() {
  return (
    <div className="pt-16">
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-sm px-4 py-2 rounded-full mb-6">
            <FileText size={14} /> Terms of Service
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Terms of Service</h1>
          <p className="text-slate-400">The rules for using LocalSkill as a job seeker or a company.</p>
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
