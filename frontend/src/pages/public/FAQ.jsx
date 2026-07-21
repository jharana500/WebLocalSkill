import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

const faqs = [
  {
    category: 'For Job Seekers',
    items: [
      { q: 'Is LocalSkill free for job seekers?', a: 'Yes, LocalSkill is completely free for job seekers. You can create a profile, search for jobs, apply, and build your resume at absolutely no cost.' },
      { q: 'How do I apply for a job?', a: 'Simply create an account, complete your profile, browse jobs, and click "Apply Now" on any listing. Your application goes directly to the company — no middlemen involved.' },
      { q: 'What is the match percentage?', a: 'Our AI-powered matching engine analyzes your skills, experience, and preferences against each job requirement to give you a personalized match score, helping you prioritize the right applications.' },
      { q: 'Can I set up job alerts?', a: 'Yes. You can configure alerts based on job title, category, location, and salary range. We\'ll notify you instantly when relevant jobs are posted.' },
    ],
  },
  {
    category: 'For Companies',
    items: [
      { q: 'How does company verification work?', a: 'We verify companies through a multi-step process: PAN/VAT validation, company registration certificate check, and a business legitimacy review. This typically takes 2–3 business days.' },
      { q: 'How much does it cost to post a job?', a: 'Pricing depends on your plan. Our Starter plan begins at NPR 4,999/month. Check our Pricing page for full details. Job seekers are always free.' },
      { q: 'Can I trial the platform before subscribing?', a: 'Yes, every paid plan comes with a 14-day free trial. No credit card required.' },
      { q: 'Can I integrate LocalSkill with my existing ATS?', a: 'Yes, Enterprise plan customers get access to custom integrations with popular ATS and HRMS systems.' },
    ],
  },
  {
    category: 'Platform & Security',
    items: [
      { q: 'How does LocalSkill protect my data?', a: 'All data is encrypted at rest and in transit. We comply with Nepal\'s data protection guidelines. We never sell your personal data to third parties.' },
      { q: 'Can companies contact me without my permission?', a: 'No. Companies can only contact candidates who have applied to their jobs or who have enabled the "Open to Work" feature on their profile.' },
      { q: 'What if I find a fake job posting?', a: 'Please report it immediately using the "Report" button on any job listing. Our moderation team reviews all reports within 24 hours and takes action.' },
    ],
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-slate-900 text-sm pr-4">{q}</span>
        {open ? <ChevronUp size={16} className="shrink-0 text-slate-400" /> : <ChevronDown size={16} className="shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
          {a}
        </div>
      )}
    </div>
  )
}

export default function FAQ() {
  const navigate = useNavigate()

  return (
    <div className="pt-16">
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h1>
          <p className="text-slate-400">Find answers to the most common questions about LocalSkill</p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto space-y-12">
          {faqs.map(({ category, items }) => (
            <div key={category}>
              <h2 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-3">
                <span className="w-1 h-6 bg-blue-600 rounded-full" />
                {category}
              </h2>
              <div className="space-y-3">
                {items.map(({ q, a }) => <FAQItem key={q} q={q} a={a} />)}
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto mt-16 text-center bg-blue-50 border border-blue-100 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-slate-900 mb-3">Still have questions?</h3>
          <p className="text-slate-500 mb-6">Our team is happy to help. Reach out and we'll respond within 24 hours.</p>
          <Button variant="primary" onClick={() => navigate('/contact')}>Contact Support</Button>
        </div>
      </section>
    </div>
  )
}
