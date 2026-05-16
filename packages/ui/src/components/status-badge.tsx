import * as React from 'react';
import { cn } from '../utils';
import { ridendineTokens } from '../tokens';

// Canonical status taxonomy comes from tokens.status. Legacy variants
// (idle/active/success/warning/danger/info) are mapped onto the canonical
// taxonomy so existing call-sites continue to work.
export type StatusVariant =
  | 'live'
  | 'fresh'
  | 'pending'
  | 'stale'
  | 'offline'
  | 'error'
  // ── Legacy aliases ──
  | 'idle'
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

type CanonicalStatus = keyof typeof ridendineTokens.status;

const LEGACY_TO_CANONICAL: Record<string, CanonicalStatus> = {
  idle: 'offline',
  active: 'fresh',
  success: 'live',
  warning: 'pending',
  danger: 'error',
  info: 'fresh',
};

function resolveStatus(status: StatusVariant): CanonicalStatus {
  if (status in ridendineTokens.status) return status as CanonicalStatus;
  return LEGACY_TO_CANONICAL[status] ?? 'offline';
}

interface StatusBadgeProps {
  status: StatusVariant;
  /** Override the default token label (e.g. "Live"). */
  label?: string;
  /** Show the pulsing dot. Defaults to true. */
  withDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  withDot = true,
  className,
}: StatusBadgeProps) {
  const canonical = resolveStatus(status);
  const config = ridendineTokens.status[canonical];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      {withDot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: config.fg }}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  );
}
