'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@ridendine/auth';
import { Button, Input, PasswordStrength } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, error } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [validationError, setValidationError] = useState('');

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

    const result = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: 'customer',
    });

    if (result.success) {
      router.push('/chefs');
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join RideNDine and discover amazing home chefs"
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
          placeholder="you@example.com"
          required
          autoComplete="email"
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
          Create account
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
