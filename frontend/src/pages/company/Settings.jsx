import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Trash2, Save } from 'lucide-react'
import { Button, Alert, CardSection } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'
import { userService } from '@/services/userService'
import { toast } from '@/store/uiStore'
import { useLogout } from '@/hooks/useAuth'

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

const NOTIFICATION_OPTIONS = [
  { key: 'newApplication', label: 'New Applications', desc: 'When a candidate applies to your job' },
  { key: 'statusUpdate', label: 'Application Updates', desc: 'When application status changes' },
  { key: 'weeklyReport', label: 'Weekly Report', desc: 'A weekly summary of your hiring activity' },
]
const DEFAULT_NOTIFICATIONS = { newApplication: true, statusUpdate: true, weeklyReport: false }

export default function CompanySettings() {
  const queryClient = useQueryClient()
  const logout = useLogout()

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passwordError, setPasswordError] = useState('')
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)
  const [deleteConfirming, setDeleteConfirming] = useState(false)

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

  const passwordMutation = useMutation({
    mutationFn: () => userService.changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      confirmPassword: passwordForm.confirmPassword,
    }),
    onSuccess: () => {
      toast.success('Password updated', 'Your password has been changed successfully.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordError('')
    },
    onError: (err) => setPasswordError(err?.response?.data?.message || err?.message || 'Could not update password'),
  })

  const handlePasswordSubmit = () => {
    setPasswordError('')
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Enter your current password, new password, and confirmation')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }
    if (!/[a-zA-Z]/.test(passwordForm.newPassword) || !/[0-9]/.test(passwordForm.newPassword)) {
      setPasswordError('New password must include at least one letter and one number')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match")
      return
    }
    passwordMutation.mutate()
  }

  const notificationsMutation = useMutation({
    mutationFn: () => userService.updateNotifications(notifications),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'notification-preferences'] })
      toast.success('Settings saved', 'Notification preferences updated.')
    },
    onError: (err) => toast.error('Could not save', err?.message || 'Please try again.'),
  })

  const deleteAccountMutation = useMutation({
    mutationFn: () => userService.deleteAccount(),
    onSuccess: () => {
      toast.success('Account deactivated', 'Your company account has been deactivated.')
      logout()
    },
    onError: (err) => toast.error('Could not deactivate account', err?.message || 'Please try again.'),
  })

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Company Settings</h1>

      <CardSection title="Change Password">
        <div className="space-y-4">
          {passwordError && <Alert type="error" message={passwordError} dismissible onClose={() => setPasswordError('')} />}
          <Input
            label="Current Password"
            type="password"
            placeholder="••••••••"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="At least 8 characters"
            hint="At least 8 characters, including one letter and one number"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            error={passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword ? 'Passwords do not match' : undefined}
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
          />
          <Button variant="primary" size="sm" icon={Save} onClick={handlePasswordSubmit} loading={passwordMutation.isPending} disabled={passwordMutation.isPending}>
            Update Password
          </Button>
        </div>
      </CardSection>

      <CardSection title="Notifications">
        <div className="space-y-4">
          {NOTIFICATION_OPTIONS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <Toggle checked={!!notifications[key]} onChange={(v) => setNotifications((n) => ({ ...n, [key]: v }))} />
            </div>
          ))}
        </div>
      </CardSection>

      <div className="flex justify-end">
        <Button
          variant="primary"
          icon={Save}
          onClick={() => notificationsMutation.mutate()}
          loading={notificationsMutation.isPending}
          disabled={notificationsMutation.isPending}
        >
          Save Settings
        </Button>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
          <Shield size={15} className="text-red-600" /> Danger Zone
        </h3>
        <p className="text-xs text-red-700 mb-4">
          Deactivating your company account will hide your jobs and profile. This can be reversed by contacting support.
        </p>
        {deleteConfirming ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-800 font-medium">Are you sure?</span>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => deleteAccountMutation.mutate()}
              loading={deleteAccountMutation.isPending}
              disabled={deleteAccountMutation.isPending}
            >
              Yes, deactivate my account
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirming(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline-danger" size="sm" icon={Trash2} onClick={() => setDeleteConfirming(true)}>
            Delete Company Account
          </Button>
        )}
      </div>
    </div>
  )
}
