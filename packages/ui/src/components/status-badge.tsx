import * as React from 'react';
import { Badge } from './badge';
import { cn } from '../utils';

export type StatusVariant = 'idle' | 'active' | 'success' | 'warning' | 'danger' | 'info';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-100 text-gray-600' },
  active: { label: 'Active', className: 'bg-blue-100 text-blue-700' },
  success: { label: 'Success', className: 'bg-emerald-100 text-emerald-700' },
  warning: { label: 'Warning', className: 'bg-amber-100 text-amber-700' },
  danger: { label: 'Danger', className: 'bg-red-100 text-red-700' },
  info: { label: 'Info', className: 'bg-sky-100 text-sky-700' },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'idle' && 'bg-gray-400',
          status === 'active' && 'bg-blue-500',
          status === 'success' && 'bg-emerald-500',
          status === 'warning' && 'bg-amber-500',
          status === 'danger' && 'bg-red-500',
          status === 'info' && 'bg-sky-500'
        )}
        aria-hidden="true"
      />
      {displayLabel}
    </span>
  );
}
