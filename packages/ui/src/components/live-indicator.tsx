import * as React from 'react';
import { cn } from '../utils';
import { ridendineTokens } from '../tokens';

export type LiveIndicatorStatus = 'connected' | 'connecting' | 'disconnected';

export interface LiveIndicatorProps {
  status: LiveIndicatorStatus;
  className?: string;
}

const STATUS_TO_TOKEN: Record<LiveIndicatorStatus, keyof typeof ridendineTokens.status> = {
  connected: 'live',
  connecting: 'pending',
  disconnected: 'error',
};

const LABEL: Record<LiveIndicatorStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Offline',
};

export function LiveIndicator({ status, className }: LiveIndicatorProps) {
  const config = ridendineTokens.status[STATUS_TO_TOKEN[status]];

  return (
    <span
      data-testid="live-indicator"
      className={cn('inline-flex items-center gap-1.5', className)}
    >
      <span
        data-testid="live-indicator-dot"
        className={cn(
          'h-2 w-2 flex-shrink-0 rounded-full',
          status === 'connected' && 'animate-pulse',
        )}
        style={{ backgroundColor: config.fg }}
      />
      <span className="text-xs font-medium" style={{ color: config.fg }}>
        {LABEL[status]}
      </span>
    </span>
  );
}
