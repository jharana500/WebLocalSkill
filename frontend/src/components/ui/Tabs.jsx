import { cn } from '@/utils/cn'
import { createContext, useContext, useState } from 'react'

const TabsContext = createContext(null)

export function Tabs({ defaultValue, value, onValueChange, children, className }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const current = value ?? internalValue

  const handleChange = (val) => {
    setInternalValue(val)
    onValueChange?.(val)
  }

  return (
    <TabsContext.Provider value={{ value: current, onChange: handleChange }}>
      <div className={cn('', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1 bg-slate-100 rounded-xl p-1',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsLinear({ children, className }) {
  return (
    <div role="tablist" className={cn('flex items-center border-b border-slate-200 gap-0', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className }) {
  const ctx = useContext(TabsContext)
  const active = ctx.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsLinearTrigger({ value, children, className }) {
  const ctx = useContext(TabsContext)
  const active = ctx.value === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.onChange(value)}
      className={cn(
        'px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 -mb-px',
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-500 hover:text-slate-700',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const ctx = useContext(TabsContext)
  if (ctx.value !== value) return null
  return <div className={cn('animate-fade-in', className)}>{children}</div>
}
