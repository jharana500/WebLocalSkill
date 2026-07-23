import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button, Alert } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { authService } from '@/services/authService'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(
        err?.message || 'Unable to send reset instructions right now. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
        <p className="text-sm text-slate-500 mb-6">
          If an account exists for <strong>{email}</strong>, we've sent password reset instructions. The link expires in 30 minutes.
        </p>
        <Button variant="primary" fullWidth onClick={() => navigate('/login')}>Back to Sign In</Button>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Send another link
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Forgot your password?</h1>
        <p className="text-slate-500 mt-1.5 text-sm">Enter your email and we'll send you a reset link.</p>
      </div>

      {error && <Alert type="error" message={error} className="mb-5" dismissible onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@email.com"
          icon={Mail}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} disabled={loading} iconRight={ArrowRight}>
          Send Reset Link
        </Button>
      </form>

      <button
        onClick={() => navigate('/login')}
        className="mt-6 w-full text-sm text-slate-500 hover:text-slate-700 text-center"
      >
        ← Back to Sign In
      </button>
    </div>
  )
}
