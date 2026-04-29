'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      }).catch(() => {});
    }
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-gray-600">
          We&apos;ve been notified and are looking into it.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-[#E85D26] px-4 py-2 text-white hover:bg-[#d44e1e]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
