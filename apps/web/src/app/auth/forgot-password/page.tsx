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
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex gap-3">
              <svg
                className="h-5 w-5 flex-shrink-0 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-[15px] font-medium text-green-800">
                  Email sent successfully
                </p>
                <p className="mt-1 text-[14px] leading-[1.6] text-green-700">
                  Check your inbox at <strong>{email}</strong> for instructions
                  to reset your password.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#FFF8F0] p-4">
            <h3 className="text-[15px] font-semibold text-[#2D3436]">
              What&apos;s next?
            </h3>
            <ul className="mt-2 space-y-1 text-[14px] leading-[1.6] text-[#5F6368]">
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
              <Button className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]">
                Back to Login
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-[15px] font-medium text-[#5F6368] hover:text-[#2D3436]"
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
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-[14px] text-red-700">
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

        <Button
          type="submit"
          className="w-full bg-[#FF6B6B] hover:bg-[#FF5252]"
          size="lg"
          loading={isSubmitting}
        >
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 space-y-3 text-center">
        <Link
          href="/auth/login"
          className="block text-[15px] font-medium text-[#FF6B6B] hover:text-[#FF5252]"
        >
          ← Back to Login
        </Link>
        <p className="text-[14px] text-[#5F6368]">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-[#FF6B6B] hover:text-[#FF5252]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
