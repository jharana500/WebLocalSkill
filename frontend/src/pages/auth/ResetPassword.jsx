import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/authService'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={30} className="text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid reset link</h2>
        <p className="text-sm text-slate-500 mb-6">
          This password reset link is missing or malformed.
        </p>
        <Link to="/forgot-password">
          <Button variant="primary" fullWidth>Request a new link</Button>
        </Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError('')
    try {
      await authService.resetPassword(token, password, confirm)
      setDone(true)
    } catch (err) {
      setError(err?.message || 'The reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Password Reset!</h2>
        <p className="text-sm text-slate-500 mb-6">Your password has been successfully updated. You can now sign in with your new password.</p>
        <Button variant="primary" fullWidth iconRight={ArrowRight} onClick={() => navigate('/login')}>Go to Sign In</Button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
        <p className="text-slate-500 mt-1.5 text-sm">Choose a strong password for your account.</p>
      </div>

      {error && (
        <Alert type="error" message={error} className="mb-5" dismissible onClose={() => setError('')} />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="At least 8 characters"
          icon={Lock}
          hint="At least 8 characters, including a letter and a number"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your new password"
          icon={Lock}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={loading}>
          Reset Password
        </Button>
      </form>
    </div>
  )
}
