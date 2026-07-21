import { cn } from '@/utils/cn'

export function Card({ children, className, hover = false, onClick, padding = 'md' }) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6', xl: 'p-8' }
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white border border-slate-200 rounded-xl shadow-[0_1px_3px_0_rgb(0,0,0,0.07)]',
        hover && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('flex items-center justify-between mb-5', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-base font-semibold text-slate-900', className)}>
      {children}
    </h3>
  )
}

export function CardSection({ title, description, action, children, className }) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
}
