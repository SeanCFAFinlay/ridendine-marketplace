'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@ridendine/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="mb-4 text-6xl">😔</div>
        <h1 className="font-display text-2xl font-bold text-text">Something went wrong</h1>
        <p className="mt-2 text-textMuted">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
          <Button variant="primary" onClick={reset}>
            Try Again
          </Button>
          <Link href="/">
            <Button variant="secondary">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
