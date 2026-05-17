'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    <div className="min-h-screen flex items-center justify-center bg-[#0f0f23] p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white">System Error</h1>
        <p className="mt-2 text-textMuted">
          An error occurred. Please try again or contact support.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white hover:bg-[#D04D16] transition-colors"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border-2 border-border px-6 py-3 font-semibold text-textSubtle hover:bg-surface transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
