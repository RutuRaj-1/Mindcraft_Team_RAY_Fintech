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
      <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--border)] border-t-[var(--brand-700)] animate-spin" />
        <span className="font-semibold tracking-wide">Loading records...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
        <p className="font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs ${className}`}>
      <table className="fin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'interactive-row' : ''}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  data-label={col.header}
                  className={
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }
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
