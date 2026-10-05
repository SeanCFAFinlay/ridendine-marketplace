'use client';

// ==========================================
// GLOBAL ERROR BOUNDARY
// Reports React rendering errors to Sentry. Without this file, render errors
// in the App Router are swallowed by React and never reach the SDK — Sentry's
// own build step warns about exactly this.
//
// Sentry.captureException is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset, so
// this is safe in local development and CI.
// ==========================================

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          margin: 0,
          padding: '2rem',
          background: '#fbfaf8',
          color: '#1c1a17',
        }}
      >
        <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Something went wrong</h1>
          <p style={{ color: '#6b6560', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            The error has been reported. Try again, and if it keeps happening please contact
            support.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.6rem 1.2rem',
              borderRadius: '0.4rem',
              border: '1px solid #3f6ea8',
              background: '#3f6ea8',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#9b958e' }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
