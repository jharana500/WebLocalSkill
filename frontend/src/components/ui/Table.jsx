import { cn } from '@/utils/cn'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export function Table({ children, className }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full text-sm', className)}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }) {
  return (
    <thead className="border-b border-slate-200">
      {children}
    </thead>
  )
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>
}

export function TableRow({ children, className, clickable, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'transition-colors',
        clickable && 'cursor-pointer hover:bg-slate-50',
        className
      )}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className, sortable, sortDir, onSort }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap',
        sortable && 'cursor-pointer select-none hover:text-slate-700',
        className
      )}
      onClick={sortable ? onSort : undefined}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {sortable && (
          <span className="text-slate-300">
            {sortDir === 'asc' ? (
              <ChevronUp size={13} className="text-blue-600" />
            ) : sortDir === 'desc' ? (
              <ChevronDown size={13} className="text-blue-600" />
            ) : (
              <ChevronsUpDown size={13} />
            )}
          </span>
        )}
      </div>
    </th>
  )
}

export function TableCell({ children, className }) {
  return (
    <td className={cn('px-4 py-3 text-slate-700', className)}>
      {children}
    </td>
  )
}

export function DataTable({ columns, data, loading, emptyMessage = 'No records found', onRowClick }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <tr>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.headerClass}>{col.header}</TableHead>
            ))}
          </tr>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    <div className="skeleton h-4 rounded w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={row.id ?? i}
                clickable={!!onRowClick}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.cellClass}>
                    {col.render ? col.render(row) : row[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
