import { cn } from '@/utils/cn'
import { Button } from './Button'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}) {
  const iconSizes = { sm: 32, md: 40, lg: 48 }
  const iconWrapperSizes = {
    sm: 'w-14 h-14',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-slate-100 mb-4',
            iconWrapperSizes[size]
          )}
        >
          <Icon size={iconSizes[size]} className="text-slate-400" />
        </div>
      )}
      <h3 className={cn('font-semibold text-slate-900', size === 'sm' ? 'text-base' : 'text-lg')}>
        {title}
      </h3>
      {description && (
        <p className={cn('mt-1.5 text-slate-500 max-w-sm', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick} variant="primary" size={size === 'sm' ? 'sm' : 'md'}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size={size === 'sm' ? 'sm' : 'md'}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
