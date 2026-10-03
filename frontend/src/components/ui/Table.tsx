import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No records found',
  className = '',
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] animate-pulse bg-white border border-[var(--border)] rounded-xl">
        Loading table records...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-white border border-[var(--border)] rounded-xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-xl border border-[var(--border)] bg-white shadow-xs ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-[var(--surface-subtle)] text-[var(--text-muted)] border-b border-[var(--border)]">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-3 px-4 font-bold tracking-tight text-[11px] uppercase ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={`transition-colors ${
                onRowClick ? 'hover:bg-[var(--surface-subtle)] cursor-pointer' : 'hover:bg-[var(--surface-subtle)]/50'
              }`}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 px-4 text-[var(--text-primary)] ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
