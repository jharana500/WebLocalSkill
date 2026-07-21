import { cn } from '@/utils/cn'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export function Drawer({ open, onClose, title, side = 'right', size = 'md', children, className }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const widths = { sm: 'w-80', md: 'w-96', lg: 'w-[480px]', xl: 'w-[640px]', full: 'w-full' }
  const translateIn = side === 'right' ? 'translate-x-0' : '-translate-x-0'
  const translateOut = side === 'right' ? 'translate-x-full' : '-translate-x-full'

  return createPortal(
    <div className={cn('fixed inset-0 z-50', !open && 'pointer-events-none')}>
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute top-0 bottom-0 bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col',
          side === 'right' ? 'right-0' : 'left-0',
          widths[size],
          open ? translateIn : translateOut,
          className
        )}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body
  )
}
