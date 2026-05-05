import * as React from 'react';
import { cn } from '../utils';
import { Button } from './button';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  className,
  title = 'Something went wrong',
  message = 'An error occurred. Please try again.',
  description,
  onRetry,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      <div className="mb-4 text-red-400">
        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-red-100">{title}</h3>
      <p className="mt-1 text-sm text-red-100/75">{description ?? message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <ErrorState message={message} onRetry={onRetry} />
    </div>
  );
}

export function FullPageError({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <ErrorState message={message} onRetry={onRetry} />
    </div>
  );
}
