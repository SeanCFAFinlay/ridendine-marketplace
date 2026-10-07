'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';
import { resolveChefRedirectTarget } from './redirect-target';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in');
      }

      const target = resolveChefRedirectTarget(searchParams.get('redirect'));
      window.location.assign(target);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Failed to sign in');
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back, Chef"
      subtitle="Sign in to manage your storefront"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {searchParams.get('signup') === 'success' && (
          <div className="rounded-lg border border-success/30 bg-successSoft p-3 text-sm text-success">
            Chef account created. Sign in to continue your storefront setup.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="chef@example.com"
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-borderStrong text-primary focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm text-textMuted">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary hover:text-[#D04D16] transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary hover:bg-[#D04D16]"
          size="lg"
          loading={loading}
        >
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-textMuted">
        Don&apos;t have a chef account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-primary hover:text-[#D04D16] transition-colors"
        >
          Apply to become a chef
        </Link>
      </p>
    </AuthLayout>
  );
}
