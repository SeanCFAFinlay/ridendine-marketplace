'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';
import { PasswordStrength } from '../../../components/auth/password-strength';

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setValidationError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setError('');

    // Validation
    if (!agreedToTerms) {
      setValidationError('You must agree to the Terms of Service');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setValidationError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to create chef account');
      }

      if (result.data?.requiresEmailConfirmation) {
        router.push('/auth/login?signup=success');
        return;
      }

      router.push('/dashboard/storefront');
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Unable to create chef account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Become a RideNDine Chef"
      subtitle="Join our community of home chefs"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || validationError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error || validationError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John"
            required
            autoComplete="given-name"
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Doe"
            required
            autoComplete="family-name"
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="chef@example.com"
          required
          autoComplete="email"
        />

        <Input
          label="Phone"
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 (555) 123-4567"
          required
          autoComplete="tel"
        />

        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            hint="At least 8 characters"
            required
            autoComplete="new-password"
          />
          <PasswordStrength password={formData.password} />
        </div>

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="••••••••"
          required
          autoComplete="new-password"
        />

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#E85D26] focus:ring-[#E85D26] focus:ring-offset-0"
          />
          <label htmlFor="terms" className="text-sm text-slate-600">
            I agree to the{' '}
            <Link href="/terms" className="font-medium text-[#E85D26] hover:text-[#D04D16]">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-[#E85D26] hover:text-[#D04D16]">
              Privacy Policy
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#E85D26] hover:bg-[#D04D16]"
          size="lg"
          loading={loading}
        >
          Create chef account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-[#E85D26] hover:text-[#D04D16] transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
