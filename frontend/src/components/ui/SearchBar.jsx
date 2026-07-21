import { cn } from '@/utils/cn'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  onSearch,
  onClear,
  className,
  size = 'md',
  showFilter = false,
  onFilterClick,
  autoFocus = false,
}) {
  const [focused, setFocused] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') onSearch?.()
    if (e.key === 'Escape') { onClear?.(); e.target.blur() }
  }

  const heights = { sm: 'h-9', md: 'h-11', lg: 'h-13' }
  const iconSizes = { sm: 15, md: 16, lg: 18 }

  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-white border rounded-xl px-4 transition-all duration-150',
        heights[size],
        focused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:border-slate-300',
        className
      )}
    >
      <Search size={iconSizes[size]} className={cn('shrink-0 transition-colors', focused ? 'text-blue-500' : 'text-slate-400')} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none min-w-0"
      />
      {value && (
        <button
          onClick={() => { onChange(''); onClear?.() }}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      )}
      {showFilter && (
        <button
          onClick={onFilterClick}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-1 pl-2 border-l border-slate-200"
        >
          <SlidersHorizontal size={15} />
        </button>
      )}
    </div>
  )
}

export function HeroSearchBar({ onSearch, className }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden',
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 px-5 py-4 border-b sm:border-b-0 sm:border-r border-slate-100">
        <Search size={18} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Job title, keywords, or company"
          className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
        />
      </div>
      <div className="flex items-center gap-3 px-5 py-4 sm:w-52">
        <svg className="text-slate-400 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City or district"
          className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none min-w-0"
        />
      </div>
      <div className="px-3 py-3">
        <button
          onClick={() => onSearch?.(query, location)}
          className="w-full sm:w-auto h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
        >
          Search Jobs
        </button>
      </div>
    </div>
  )
}
