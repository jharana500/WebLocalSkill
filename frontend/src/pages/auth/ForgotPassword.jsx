import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSent(true) }, 1200)
  }

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={30} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h2>
        <p className="text-sm text-slate-500 mb-6">
          We've sent a password reset link to <strong>{email}</strong>. The link expires in 30 minutes.
        </p>
        <Button variant="primary" fullWidth onClick={() => navigate('/login')}>Back to Sign In</Button>
        <button
          onClick={() => setSent(false)}
          className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline"
        >
          Resend email
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
        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} iconRight={ArrowRight}>
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
