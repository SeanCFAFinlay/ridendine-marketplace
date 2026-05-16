'use client';

import * as React from 'react';
import { cn } from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────

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

export interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  data: TRow[];
  keyExtractor: (row: TRow) => string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  pageSize?: number;
  pageSizeOptions?: number[];
  /** "default" gives breathing room; "compact" is for dense ops-admin lists. */
  size?: 'default' | 'compact';
  className?: string;
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function TableSkeleton({
  columns,
  rows = 5,
  rowPadding,
}: {
  columns: number;
  rows?: number;
  rowPadding: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="animate-pulse border-b border-divider">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className={cn(rowPadding)}>
              <div className="h-4 w-3/4 rounded bg-surfaceMuted" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction?: SortDirection }) {
  return (
    <svg
      className={cn(
        'ml-1 h-3.5 w-3.5 transition-transform',
        direction === 'desc' && 'rotate-180',
      )}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 2l4 5H2l4-5z" />
    </svg>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function Pagination({
  page,
  totalPages,
  totalRows,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalRows === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface px-6 py-3 text-xs text-textMuted">
      <div>
        Showing <span className="font-semibold text-text">{from}</span>–
        <span className="font-semibold text-text">{to}</span> of{' '}
        <span className="font-semibold text-text">{totalRows}</span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text focus:outline-none focus-visible:shadow-focus"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md px-2 py-1 font-medium text-textMuted transition-colors hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Previous page"
          >
            Prev
          </button>
          <span className="px-2 font-medium text-text">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md px-2 py-1 font-medium text-textMuted transition-colors hover:bg-surfaceMuted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function DataTable<TRow>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  pageSize: initialPageSize = 25,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  size = 'default',
  className,
}: DataTableProps<TRow>) {
  const [sort, setSort] = React.useState<SortState | null>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  const cellPadding = size === 'compact' ? 'px-6 py-2' : 'px-6 py-4';

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
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-surface',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-surfaceMuted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-textMuted',
                    col.sortable && 'cursor-pointer select-none hover:text-text',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
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
          <tbody>
            {isLoading && (
              <TableSkeleton columns={columns.length} rowPadding={cellPadding} />
            )}
            {isEmpty && (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {emptyState ?? (
                    <p className="text-sm text-textMuted">No data available</p>
                  )}
                </td>
              </tr>
            )}
            {!isLoading && !isEmpty &&
              paginatedData.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-divider transition-colors hover:bg-surfaceMuted/50 last:border-b-0"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(cellPadding, 'text-text', col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={totalPages}
        totalRows={sortedData.length}
        pageSize={pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageChange={setPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
        }}
      />
    </div>
  );
}
