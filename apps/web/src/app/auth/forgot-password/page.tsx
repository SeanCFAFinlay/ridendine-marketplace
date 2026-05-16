'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input } from '@ridendine/ui';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useAuth } from '@ridendine/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setIsSubmitted(true);
      } else {
        setError(result.error || 'Failed to send reset email. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent password reset instructions"
      >
        <div className="space-y-6">
          <div className="rounded-md border border-success/30 bg-successSoft p-4">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-success">
                  Email sent successfully
                </p>
                <p className="mt-1 text-sm leading-relaxed text-success/80">
                  Check your inbox at <strong>{email}</strong> for instructions
                  to reset your password.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-primarySoft p-4">
            <h3 className="text-sm font-semibold text-text">What&apos;s next?</h3>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-textMuted">
              <li className="flex gap-2">
                <span>1.</span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex gap-2">
                <span>2.</span>
                <span>Click the password reset link</span>
              </li>
              <li className="flex gap-2">
                <span>3.</span>
                <span>Create a new password</span>
              </li>
              <li className="flex gap-2">
                <span>4.</span>
                <span>Sign in with your new password</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/auth/login">
              <Button variant="primary" fullWidth>Back to Login</Button>
            </Link>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-sm font-medium text-textMuted transition-colors hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
            >
              Didn&apos;t receive email? Try again
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive reset instructions"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          autoFocus
        />

        <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <Link
          href="/auth/login"
          className="block text-sm font-medium text-primary transition-colors hover:underline"
        >
          ← Back to Login
        </Link>
        <p className="text-sm text-textMuted">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-primary transition-colors hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
