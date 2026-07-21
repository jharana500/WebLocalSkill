import { cn } from '@/utils/cn'
import { getInitials } from '@/utils/formatters'

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
}

const colors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
]

function getColorForName(name) {
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function Avatar({ src, name, size = 'md', className, status }) {
  const initials = getInitials(name)
  const colorClass = getColorForName(name)

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-semibold select-none overflow-hidden',
          sizes[size],
          !src && colorClass
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-white',
            size === 'xs' || size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5',
            status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
          )}
        />
      )}
    </div>
  )
}

export function AvatarGroup({ avatars = [], max = 4, size = 'sm' }) {
  const visible = avatars.slice(0, max)
  const rest = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((av, i) => (
        <Avatar key={i} {...av} size={size} className="ring-2 ring-white" />
      ))}
      {rest > 0 && (
        <div
          className={cn(
            'rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-600 font-medium ring-2 ring-white',
            sizes[size],
            'text-xs'
          )}
        >
          +{rest}
        </div>
      )}
    </div>
  )
}
