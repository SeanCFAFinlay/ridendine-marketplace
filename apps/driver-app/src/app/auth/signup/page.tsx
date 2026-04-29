'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button, Input, PasswordStrength } from '@ridendine/ui';

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  vehicleType: string;
};

const VEHICLE_TYPES = [
  { value: 'car', label: 'Car' },
  { value: 'motorcycle', label: 'Motorcycle' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'scooter', label: 'Scooter' },
] as const;

const INITIAL_FORM: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  vehicleType: 'car',
};

function SuccessScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f1923] to-[#1a2d3d] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900">Application Submitted!</h2>
        <p className="mt-3 text-gray-600">
          Your driver application is being reviewed. You&apos;ll be able to log in once approved
          by our operations team.
        </p>
        <Link href="/auth/login">
          <Button className="mt-6 w-full bg-[#E85D26] hover:bg-[#d44e1e]">Go to Login</Button>
        </Link>
      </div>
    </div>
  );
}

function validateForm(formData: FormData, agreedToTerms: boolean): string | null {
  if (!agreedToTerms) return 'You must agree to the Terms of Service';
  if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
  if (formData.password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

export default function DriverSignupPage() {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm(formData, agreedToTerms);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) return <SuccessScreen />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f1923] to-[#1a2d3d] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Image
            src="/logo-icon.png"
            alt="RideNDine"
            width={64}
            height={64}
            className="mx-auto rounded-2xl shadow-lg"
          />
          <h1 className="mt-3 text-2xl font-bold">
            <span className="text-[#1a9e8e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </h1>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
            Driver Application
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">Become a Driver</h2>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  autoComplete="given-name"
                />
              </div>
              <div>
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
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="driver@example.com"
              required
              autoComplete="email"
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              required
              autoComplete="tel"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Type
              </label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              >
                {VEHICLE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <Input
                label="Password"
                name="password"
                type="password"
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
              name="confirmPassword"
              type="password"
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
              <label htmlFor="terms" className="text-sm text-gray-600">
                I agree to the{' '}
                <Link href="/terms" className="font-medium text-[#E85D26] hover:text-[#d44e1e]">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="font-medium text-[#E85D26] hover:text-[#d44e1e]">
                  Privacy Policy
                </Link>
              </label>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#E85D26] hover:bg-[#d44e1e]"
              size="lg"
              loading={loading}
            >
              Submit Application
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-[#E85D26] hover:text-[#d44e1e]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
