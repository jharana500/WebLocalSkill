import { cn } from '@/utils/cn'
import { ShieldCheck } from 'lucide-react'

const variants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-blue-50 text-blue-700 border border-blue-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-700 border border-red-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  outline: 'border border-slate-200 text-slate-600 bg-white',
}

const sizes = {
  xs: 'text-xs px-1.5 py-0.5 gap-1',
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon: Icon,
  dot = false,
  className,
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', {
          'bg-blue-500': variant === 'primary',
          'bg-emerald-500': variant === 'success',
          'bg-amber-500': variant === 'warning',
          'bg-red-500': variant === 'danger',
          'bg-slate-400': variant === 'default' || variant === 'outline',
        })} />
      )}
      {Icon && <Icon size={10} />}
      {children}
    </span>
  )
}

export function VerifiedBadge({ size = 'sm', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200',
        size === 'xs' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        className
      )}
    >
      <ShieldCheck size={10} className="text-blue-600" />
      Verified
    </span>
  )
}
