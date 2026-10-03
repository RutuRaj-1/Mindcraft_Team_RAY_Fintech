import React, { useState } from 'react';
import { Table, Column } from '../ui/Table';
import { Search, Filter } from 'lucide-react';

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search records...',
  onRowClick,
  isLoading,
  className = '',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = React.useMemo(() => {
    if (!searchTerm || !searchKey) return data;
    return data.filter((item) => {
      const val = item[searchKey];
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data, searchTerm, searchKey]);

  return (
    <div className={`space-y-3 ${className}`}>
      {searchKey && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[var(--border)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-700)] shadow-xs"
            />
          </div>

          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
            Showing {filteredData.length} of {data.length} records
          </span>
        </div>
      )}

      <Table
        columns={columns}
        data={filteredData}
        onRowClick={onRowClick}
        isLoading={isLoading}
      />
    </div>
  );
}
