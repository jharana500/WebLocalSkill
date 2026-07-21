import { useState } from 'react'
import { Save, Shield, Bell, Globe, Database, AlertTriangle } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Input, Textarea } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn('w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0', checked ? 'bg-blue-600' : 'bg-slate-200')}
    >
      <div className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Icon size={15} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function AdminSettings() {
  const [saved, setSaved] = useState(false)
  const [general, setGeneral] = useState({
    siteName: 'LocalSkill',
    tagline: 'Nepal\'s Verified Hiring Platform',
    supportEmail: 'support@localskill.com.np',
    maintenanceMode: false,
  })
  const [notifications, setNotifications] = useState({
    newUserAlert: true,
    verificationAlert: true,
    paymentFailureAlert: true,
    weeklyDigest: false,
  })
  const [security, setSecurity] = useState({
    requireEmailVerification: true,
    autoSuspendFlagged: false,
    twoFactorAdmin: true,
    maxLoginAttempts: '5',
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure global platform behaviour</p>
      </div>

      {saved && <Alert type="success" title="Settings saved successfully" dismissible />}

      <Section icon={Globe} title="General">
        <div className="space-y-4">
          <Input
            label="Platform Name"
            value={general.siteName}
            onChange={e => setGeneral(g => ({ ...g, siteName: e.target.value }))}
          />
          <Input
            label="Tagline"
            value={general.tagline}
            onChange={e => setGeneral(g => ({ ...g, tagline: e.target.value }))}
          />
          <Input
            label="Support Email"
            type="email"
            value={general.supportEmail}
            onChange={e => setGeneral(g => ({ ...g, supportEmail: e.target.value }))}
          />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Maintenance Mode</p>
              <p className="text-xs text-slate-500">Show a maintenance page to all visitors</p>
            </div>
            <Toggle checked={general.maintenanceMode} onChange={v => setGeneral(g => ({ ...g, maintenanceMode: v }))} />
          </div>
        </div>
      </Section>

      <Section icon={Bell} title="Admin Notifications">
        <div className="space-y-4">
          {[
            { key: 'newUserAlert', label: 'New User Registrations', desc: 'Alert when a new user signs up' },
            { key: 'verificationAlert', label: 'Verification Submissions', desc: 'Alert when a company submits for verification' },
            { key: 'paymentFailureAlert', label: 'Payment Failures', desc: 'Alert when a subscription payment fails' },
            { key: 'weeklyDigest', label: 'Weekly Platform Digest', desc: 'Summary email every Monday morning' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Toggle checked={notifications[key]} onChange={v => setNotifications(n => ({ ...n, [key]: v }))} />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Shield} title="Security">
        <div className="space-y-4">
          {[
            { key: 'requireEmailVerification', label: 'Require Email Verification', desc: 'Users must verify email before accessing the platform' },
            { key: 'autoSuspendFlagged', label: 'Auto-Suspend Flagged Content', desc: 'Automatically suspend jobs with multiple flags' },
            { key: 'twoFactorAdmin', label: 'Require 2FA for Admins', desc: 'All admin accounts must have 2FA enabled' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Toggle checked={security[key]} onChange={v => setSecurity(s => ({ ...s, [key]: v }))} />
            </div>
          ))}
          <Input
            label="Max Failed Login Attempts"
            type="number"
            min={1}
            max={20}
            value={security.maxLoginAttempts}
            onChange={e => setSecurity(s => ({ ...s, maxLoginAttempts: e.target.value }))}
            hint="Account gets locked after this many consecutive failures"
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button variant="primary" icon={Save} onClick={handleSave}>Save All Settings</Button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-600" /> Danger Zone
        </h3>
        <p className="text-xs text-red-700 mb-4">These actions are irreversible. Proceed with extreme caution.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline-danger" size="sm">Flush Cache</Button>
          <Button variant="outline-danger" size="sm">Purge Inactive Users</Button>
          <Button variant="outline-danger" size="sm">Reset Platform Analytics</Button>
        </div>
      </div>
    </div>
  )
}
