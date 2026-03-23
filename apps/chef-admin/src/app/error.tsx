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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-gray-600">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="inline-block rounded-lg bg-[#E85D26] px-6 py-3 font-semibold text-white hover:bg-[#D04D16] transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border-2 border-[#E85D26] px-6 py-3 font-semibold text-[#E85D26] hover:bg-orange-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
