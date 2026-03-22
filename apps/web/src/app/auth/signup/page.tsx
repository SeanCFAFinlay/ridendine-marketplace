'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@ridendine/auth';
import { Button, Input, Card, Spinner } from '@ridendine/ui';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const { signUp, loading, error } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [validationError, setValidationError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    const result = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: role || 'customer',
    });

    if (result.success) {
      router.push('/auth/verify-email');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-brand-600">
            Ridendine
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">
            {role === 'chef' ? 'Become a Chef' : 'Create your account'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {role === 'chef'
              ? 'Start sharing your culinary creations'
              : 'Join Ridendine today'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {(error || validationError) && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error || validationError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              required
            />
            <Input
              label="Last name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Doe"
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            hint="At least 8 characters"
            required
          />

          <Input
            label="Confirm password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            {role === 'chef' ? 'Apply to become a chef' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-gray-400">
          By signing up, you agree to our{' '}
          <Link href="/terms" className="underline">Terms of Service</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <SignupForm />
    </Suspense>
  );
}
