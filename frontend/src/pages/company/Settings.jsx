import { useState } from 'react'
import { Lock, Bell, Shield, Trash2, Save } from 'lucide-react'
import { Button, Alert, CardSection } from '@/components/ui'
import { Input } from '@/components/ui/Input'
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

export default function CompanySettings() {
  const [notifications, setNotifications] = useState({ newApplication: true, statusUpdate: true, weeklyReport: false })
  const [saved, setSaved] = useState(false)

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>

      {saved && <Alert type="success" title="Settings saved" dismissible />}

      <CardSection title="Change Password">
        <div className="space-y-4">
          <Input label="Current Password" type="password" placeholder="••••••••" />
          <Input label="New Password" type="password" placeholder="At least 8 characters" />
          <Input label="Confirm New Password" type="password" placeholder="Repeat new password" />
          <Button variant="primary" size="sm" icon={Save}>Update Password</Button>
        </div>
      </CardSection>

      <CardSection title="Notifications">
        <div className="space-y-4">
          {[
            { key: 'newApplication', label: 'New Applications', desc: 'When a candidate applies to your job' },
            { key: 'statusUpdate', label: 'Application Updates', desc: 'When application status changes' },
            { key: 'weeklyReport', label: 'Weekly Report', desc: 'A weekly summary of your hiring activity' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Toggle checked={notifications[key]} onChange={(v) => setNotifications(n => ({ ...n, [key]: v }))} />
            </div>
          ))}
        </div>
      </CardSection>

      <div className="flex justify-end">
        <Button variant="primary" icon={Save} onClick={() => setSaved(true)}>Save Settings</Button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
          <Shield size={15} className="text-red-600" /> Danger Zone
        </h3>
        <p className="text-xs text-red-700 mb-4">Deleting your company account will remove all jobs, applications, and data permanently.</p>
        <Button variant="outline-danger" size="sm" icon={Trash2}>Delete Company Account</Button>
      </div>
    </div>
  )
}
