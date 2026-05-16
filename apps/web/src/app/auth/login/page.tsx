'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type FieldErrors = { email?: string; password?: string };
type FieldTouched = { email: boolean; password: boolean };

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<FieldTouched>({ email: false, password: false });

  const validateEmail = (value: string): string | undefined => {
    if (!value) return 'Email is required';
    if (!isValidEmail(value)) return 'Enter a valid email address';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return 'Password is required';
    return undefined;
  };

  const validateAll = (): FieldErrors => ({
    email: validateEmail(email),
    password: validatePassword(password),
  });

  const handleBlur = (field: keyof FieldTouched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'email') {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(email) }));
    }
    if (field === 'password') {
      setFieldErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors = validateAll();
    const hasErrors = Object.values(errors).some(Boolean);

    setFieldErrors(errors);
    setTouched({ email: true, password: true });

    if (hasErrors) return;

    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setServerError(data.error || 'Sign in failed');
        return;
      }

      const redirect = searchParams.get('redirect');
      window.location.assign(redirect || '/chefs');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {serverError && (
          <div className="rounded-md border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {serverError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (touched.email) {
              setFieldErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }));
            }
          }}
          onBlur={() => handleBlur('email')}
          placeholder="you@example.com"
          autoComplete="email"
          error={touched.email ? fieldErrors.email : undefined}
          valid={touched.email && !fieldErrors.email && !!email}
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (touched.password) {
              setFieldErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }));
            }
          }}
          onBlur={() => handleBlur('password')}
          placeholder="••••••••"
          autoComplete="current-password"
          error={touched.password ? fieldErrors.password : undefined}
          valid={touched.password && !fieldErrors.password && !!password}
        />

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary focus-visible:shadow-focus focus-visible:outline-none"
            />
            <span className="text-sm text-textMuted">Remember me</span>
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary transition-colors hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-textMuted">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-primary transition-colors hover:underline"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
