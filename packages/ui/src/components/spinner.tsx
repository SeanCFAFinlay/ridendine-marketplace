import * as React from 'react';
import { cn } from '../utils';
import { Logo } from '../assets/logo';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  return (
    <div
      className={cn('flex items-center justify-center', className)}
      role="status"
      aria-label="Loading"
      {...props}
    >
      <svg
        className={cn('animate-spin text-primary', SIZE_CLASS[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </div>
  );
}

/** Standard in-page loader (sits inside a route container). */
export function PageLoader() {
  return (
    <div
      className="flex min-h-[400px] flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Loading"
    >
      <Logo height={36} className="animate-pulse" />
      <Spinner size="md" />
    </div>
  );
}

/** Full-viewport loader used during route transitions. Shared across all apps
 *  so cross-app navigation never flashes a generic spinner. */
export function FullPageLoader() {
  return (
    <div className="fixed inset-0 z-modal flex flex-col items-center justify-center gap-4 bg-background">
      <Logo height={42} className="animate-pulse" />
      <Spinner size="md" />
    </div>
  );
}
