import { useState } from 'react'
import { MapPin, Mail, Phone, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Input, Textarea, Select } from '@/components/ui/Input'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  if (sent) {
    return (
      <div className="pt-16 min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={36} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Message Sent!</h2>
          <p className="text-slate-500 mb-8">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
          <Button variant="primary" onClick={() => setSent(false)}>Send Another Message</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-16">
      <section className="bg-slate-900 px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-4">Get In Touch</h1>
          <p className="text-slate-400">Have questions? We'd love to hear from you. Send us a message and we'll respond within 24 hours.</p>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10">
          {/* Contact Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-6">Contact Information</h2>
              {[
                { icon: MapPin, title: 'Office Address', value: 'Durbarmarg, Kathmandu\nBagmati Province, Nepal' },
                { icon: Mail, title: 'Email', value: 'hello@localskill.com.np' },
                { icon: Phone, title: 'Phone', value: '+977 01 4XXXXXX' },
              ].map(({ icon: Icon, title, value }) => (
                <div key={title} className="flex gap-4 mb-6">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <p className="text-sm text-slate-500 whitespace-pre-line mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
              <h3 className="font-semibold text-slate-900 mb-2">Office Hours</h3>
              <p className="text-sm text-slate-600">Sunday – Friday: 9 AM – 6 PM</p>
              <p className="text-sm text-slate-600">Saturday: Closed</p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Input
                    label="Full Name"
                    placeholder="Your name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="your@email.com"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <Select
                  label="Subject"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Select a topic..."
                >
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="billing">Billing & Subscription</option>
                  <option value="verification">Company Verification</option>
                  <option value="partnership">Partnership</option>
                </Select>
                <Textarea
                  label="Message"
                  placeholder="Tell us how we can help..."
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
                <Button type="submit" variant="primary" size="lg" icon={Send} fullWidth>
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
