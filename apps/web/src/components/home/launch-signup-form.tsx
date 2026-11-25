'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@ridendine/ui';
import { LAUNCH_CONSENT_TEXT } from '@ridendine/validation';

export function LaunchSignupForm({ source }: { source: 'home' | 'coming-soon' }) {
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/launch-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, company }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      setError(
        res.status === 400
          ? 'Enter a valid email address.'
          : res.status === 429
            ? 'Too many tries. Wait a minute and try again.'
            : 'We could not save that. Please try again.'
      );
    } catch {
      setError('We could not reach RideNDine. Check your connection and try again.');
    }
    setState('idle');
  }

  if (state === 'done') {
    return (
      <p role="status" className="rounded-lg bg-successSoft p-4 text-center font-semibold text-success">
        You&apos;re on the list. We&apos;ll email {email.trim()} when ordering opens.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="text-left" data-testid="launch-signup-form">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          type="email"
          aria-label="Email address"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="you@example.com"
          className="h-12"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error || undefined}
        />
        <Button type="submit" size="lg" loading={state === 'sending'} className="shrink-0">
          Notify me
        </Button>
      </div>
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <p className="mt-3 text-sm text-textMuted">
        {LAUNCH_CONSENT_TEXT}{' '}
        <Link href="/privacy" className="underline hover:text-primary">
          Privacy policy
        </Link>
      </p>
    </form>
  );
}
