import { cn } from '@/utils/cn'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import useUIStore from '@/store/uiStore'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'border-emerald-200 bg-white',
  error: 'border-red-200 bg-white',
  warning: 'border-amber-200 bg-white',
  info: 'border-blue-200 bg-white',
}

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

function ToastItem({ id, type = 'info', title, message }) {
  const removeToast = useUIStore((s) => s.removeToast)
  const Icon = icons[type] || Info

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-80 bg-white rounded-xl border shadow-lg p-4 animate-toast',
        styles[type]
      )}
    >
      <Icon size={18} className={cn('mt-0.5 shrink-0', iconStyles[type])} />
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-slate-900">{title}</p>}
        {message && <p className="text-sm text-slate-500 mt-0.5">{message}</p>}
      </div>
      <button
        onClick={() => removeToast(id)}
        className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>,
    document.body
  )
}
