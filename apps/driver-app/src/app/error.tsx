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
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-600">
          We couldn't load this page. Please try again.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <button
            onClick={reset}
            className="inline-block rounded-lg bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="inline-block rounded-lg border-2 border-brand-500 px-6 py-3 font-semibold text-brand-500 hover:bg-brand-50 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
