'use client';

import * as React from 'react';
import { cn } from '../utils';

// ==========================================
// TYPES
// ==========================================

type SortDirection = 'asc' | 'desc';

interface SortState {
  key: string;
  direction: SortDirection;
}

export interface ColumnDef<TRow> {
  key: string;
  header: string;
  sortable?: boolean;
  cell: (row: TRow) => React.ReactNode;
  className?: string;
}

interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  data: TRow[];
  keyExtractor: (row: TRow) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pageSize?: number;
  className?: string;
}

// ==========================================
// SKELETON
// ==========================================

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ==========================================
// SORT ICON
// ==========================================

function SortIcon({ direction }: { direction?: SortDirection }) {
  return (
    <svg
      className={cn('ml-1 h-3.5 w-3.5 transition-transform', direction === 'desc' && 'rotate-180')}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 2l4 5H2l4-5z" />
    </svg>
  );
}

// ==========================================
// PAGINATION
// ==========================================

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="text-xs text-gray-500">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function DataTable<TRow>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  pageSize = 20,
  className,
}: DataTableProps<TRow>) {
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [page, setPage] = React.useState(1);

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setPage(1);
  };

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[sort.key] ?? '');
      const bVal = String((b as Record<string, unknown>)[sort.key] ?? '');
      const cmp = aVal.localeCompare(bVal);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);

  const isEmpty = !isLoading && data.length === 0;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-900 dark:hover:text-gray-100',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === 'asc' ? 'ascending' : 'descending'
                      : undefined
                  }
                >
                  <span className="flex items-center">
                    {col.header}
                    {col.sortable && (
                      <SortIcon direction={sort?.key === col.key ? sort.direction : undefined} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
            {isLoading && <TableSkeleton columns={columns.length} />}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {emptyState ?? (
                    <p className="text-sm text-gray-400">No data available</p>
                  )}
                </td>
              </tr>
            )}
            {!isLoading && !isEmpty && paginatedData.map((row) => (
              <tr
                key={keyExtractor(row)}
                className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-gray-700 dark:text-gray-300', col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
