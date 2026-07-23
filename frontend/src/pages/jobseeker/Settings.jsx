import { useState, useEffect } from 'react'
import { Lock, Trash2, Shield, Save, AlertTriangle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button, Alert, CardSection } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { userService } from '@/services/userService'
import useAuthStore from '@/store/authStore'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0',
        checked ? 'bg-blue-600' : 'bg-slate-200'
      )}
    >
      <div className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
        checked ? 'translate-x-[22px]' : 'translate-x-0.5'
      )} />
    </button>
  )
}

export default function JSSettings() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { logout } = useAuthStore()

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const DEFAULT_NOTIFICATIONS = {
    newJobMatch: true, applicationUpdates: true,
    weeklyDigest: false, marketingEmails: false,
  }
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: prefsData } = useQuery({
    queryKey: ['user', 'notification-preferences'],
    queryFn: () => userService.getNotificationPreferences(),
    staleTime: 1000 * 60,
  })

  useEffect(() => {
    if (prefsData?.settings && Object.keys(prefsData.settings).length > 0) {
      setNotifications({ ...DEFAULT_NOTIFICATIONS, ...prefsData.settings })
    }
  }, [prefsData])

  const pwMutation = useMutation({
    mutationFn: () => userService.changePassword({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
    onSuccess: () => { setPwForm({ current: '', newPw: '', confirm: '' }); setPwError('') },
    onError: (err) => setPwError(err?.response?.data?.message || 'Failed to update password'),
  })

  const notifMutation = useMutation({
    mutationFn: () => userService.updateNotifications(notifications),
    onSuccess: () => queryClient.invalidateQueries(['user', 'notification-preferences']),
  })

  const deleteMutation = useMutation({
    mutationFn: () => userService.deleteAccount(),
    onSuccess: () => { logout(); navigate('/') },
  })

  const handlePasswordSubmit = () => {
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Passwords do not match'); return }
    if (pwForm.newPw.length < 8) { setPwError('Password must be at least 8 characters'); return }
    setPwError('')
    pwMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account preferences</p>
      </div>

      {notifMutation.isSuccess && <Alert type="success" message="Settings saved successfully." dismissible />}
      {pwMutation.isSuccess && <Alert type="success" message="Password updated successfully." dismissible />}

      <CardSection title="Change Password" icon={Lock} description="Update your account password">
        <div className="space-y-4">
          {pwError && <Alert type="error" message={pwError} />}
          <Input label="Current Password" type="password" placeholder="••••••••"
            value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          <Input label="New Password" type="password" placeholder="At least 8 characters"
            value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
          <Input label="Confirm New Password" type="password" placeholder="Repeat new password"
            value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          <Button variant="primary" size="sm" icon={Save}
            loading={pwMutation.isPending}
            disabled={!pwForm.current || !pwForm.newPw || !pwForm.confirm}
            onClick={handlePasswordSubmit}>
            Update Password
          </Button>
        </div>
      </CardSection>

      <CardSection title="Notifications" description="Choose what you want to be notified about">
        <div className="space-y-4">
          {[
            { key: 'newJobMatch', label: 'New Job Matches', desc: 'When jobs matching your profile are posted' },
            { key: 'applicationUpdates', label: 'Application Updates', desc: 'When your application status changes' },
            { key: 'weeklyDigest', label: 'Weekly Job Digest', desc: 'A weekly summary of top jobs for you' },
            { key: 'marketingEmails', label: 'Marketing Emails', desc: 'Tips, news, and product updates' },
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
      </CardSection>

      <div className="flex justify-end">
        <Button variant="primary" icon={Save} loading={notifMutation.isPending} onClick={() => notifMutation.mutate()}>
          Save All Settings
        </Button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
          <Shield size={15} className="text-red-600" /> Danger Zone
        </h3>
        <p className="text-xs text-red-700 mb-4">These actions are permanent and cannot be undone.</p>
        {!confirmDelete ? (
          <Button variant="outline-danger" size="sm" icon={Trash2} onClick={() => setConfirmDelete(true)}>
            Delete Account
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-800 font-medium flex items-center gap-2">
              <AlertTriangle size={14} /> Are you absolutely sure? All your data will be erased.
            </p>
            <div className="flex gap-2">
              <Button variant="outline-danger" size="sm" icon={Trash2}
                loading={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                Yes, Delete My Account
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
            {deleteMutation.isError && <Alert type="error" message="Failed to delete account. Please try again." />}
          </div>
        )}
      </div>
    </div>
  )
}
