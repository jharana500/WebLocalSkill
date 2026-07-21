import { cn } from '@/utils/cn'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useState } from 'react'

const variants = {
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: 'text-emerald-500',
    Icon: CheckCircle2,
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-900',
    icon: 'text-red-500',
    Icon: XCircle,
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: 'text-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: 'text-blue-500',
    Icon: Info,
  },
}

export function Alert({ type = 'info', title, message, dismissible = false, className, actions }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  const { container, icon, Icon } = variants[type] || variants.info

  return (
    <div className={cn('flex gap-3 rounded-xl border p-4', container, className)}>
      <Icon size={18} className={cn('shrink-0 mt-0.5', icon)} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {message && <p className={cn('text-sm', title ? 'mt-0.5 opacity-80' : '')}>{message}</p>}
        {actions && <div className="mt-3 flex gap-2">{actions}</div>}
      </div>
      {dismissible && (
        <button
          onClick={() => setDismissed(true)}
          className="text-current opacity-50 hover:opacity-80 transition-opacity shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
