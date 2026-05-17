'use client';

import { cn } from '@ridendine/ui';

interface KpiCardProps {
  label: string;
  value: string;
  change?: number;
  subtitle?: string;
  className?: string;
}

function ChangeIndicator({ change }: { change: number }) {
  const isUp = change > 0;
  const isNeutral = change === 0;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isNeutral && 'text-textMuted',
        isUp && 'text-success',
        !isUp && !isNeutral && 'text-danger'
      )}
    >
      {!isNeutral && (
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="currentColor"
          aria-hidden="true"
        >
          {isUp ? (
            <path d="M6 2l4 5H2l4-5z" />
          ) : (
            <path d="M6 10L2 5h8l-4 5z" />
          )}
        </svg>
      )}
      {change > 0 ? '+' : ''}{change.toFixed(1)}%
    </span>
  );
}

export function KpiCard({ label, value, change, subtitle, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface p-4',
        className
      )}
    >
      <p className="truncate text-xs font-medium uppercase tracking-wider text-textMuted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {change !== undefined && <ChangeIndicator change={change} />}
        {subtitle && (
          <span className="text-xs text-textMuted">{subtitle}</span>
        )}
      </div>
    </div>
  );
}
