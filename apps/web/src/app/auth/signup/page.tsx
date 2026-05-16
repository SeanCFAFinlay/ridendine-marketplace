'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@ridendine/auth';
import { Button, Input, PasswordStrength } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormData, string>>;
type FieldTouched = Partial<Record<keyof FormData, boolean>>;

function validateField(field: keyof FormData, value: string, formData: FormData): string | undefined {
  switch (field) {
    case 'firstName':
      return value.trim() ? undefined : 'First name is required';
    case 'lastName':
      return value.trim() ? undefined : 'Last name is required';
    case 'email':
      if (!value) return 'Email is required';
      if (!isValidEmail(value)) return 'Enter a valid email address';
      return undefined;
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 8) return 'At least 8 characters required';
      return undefined;
    case 'confirmPassword':
      if (!value) return 'Please confirm your password';
      if (value !== formData.password) return 'Passwords do not match';
      return undefined;
    default:
      return undefined;
  }
}

function validateAll(formData: FormData): FieldErrors {
  const fields: (keyof FormData)[] = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
  return Object.fromEntries(
    fields.map((f) => [f, validateField(f, formData[f], formData)])
  ) as FieldErrors;
}

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, loading, error } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<FieldTouched>({});
  const [termsError, setTermsError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralError, setReferralError] = useState('');

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) setReferralCode(ref.toUpperCase());
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const field = name as keyof FormData;

    setFormData((prev) => ({ ...prev, [field]: value }));

    if (touched[field]) {
      const updated = { ...formData, [field]: value };
      setFieldErrors((prev) => ({
        ...prev,
        [field]: validateField(field, value, updated),
      }));
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: validateField(field, formData[field], formData),
    }));
  };

  const applyReferralCode = async (code: string) => {
    setReferralError('');
    try {
      const res = await fetch('/api/referrals/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, userType: 'customer' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setReferralError(body?.error?.message ?? 'Invalid referral code');
      }
    } catch {
      // Non-blocking — don't fail signup over referral errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTermsError('');

    const errors = validateAll(formData);
    const allTouched = Object.fromEntries(
      Object.keys(formData).map((k) => [k, true])
    ) as FieldTouched;

    setFieldErrors(errors);
    setTouched(allTouched);

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) return;

    if (!agreedToTerms) {
      setTermsError('You must agree to the Terms of Service');
      return;
    }

    const result = await signUp(formData.email, formData.password, {
      first_name: formData.firstName,
      last_name: formData.lastName,
      role: 'customer',
    });

    if (result.success) {
      if (referralCode.trim()) {
        await applyReferralCode(referralCode.trim());
      }
      router.push('/chefs');
    }
  };

  const isFieldValid = (field: keyof FormData) =>
    !!touched[field] && !fieldErrors[field] && !!formData[field];

  return (
    <AuthLayout title="Create your account" subtitle="Join RideNDine and discover amazing home chefs">
      <form onSubmit={handleSubmit} className="space-y-4">
        {(error || termsError) && (
          <div className="rounded-md border border-danger/30 bg-dangerSoft p-3 text-sm text-danger">
            {error || termsError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={() => handleBlur('firstName')}
            placeholder="John"
            autoComplete="given-name"
            error={touched.firstName ? fieldErrors.firstName : undefined}
            valid={isFieldValid('firstName')}
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={() => handleBlur('lastName')}
            placeholder="Doe"
            autoComplete="family-name"
            error={touched.lastName ? fieldErrors.lastName : undefined}
            valid={isFieldValid('lastName')}
          />
        </div>

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={() => handleBlur('email')}
          placeholder="you@example.com"
          autoComplete="email"
          error={touched.email ? fieldErrors.email : undefined}
          valid={isFieldValid('email')}
        />

        <div>
          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={() => handleBlur('password')}
            placeholder="••••••••"
            autoComplete="new-password"
            error={touched.password ? fieldErrors.password : undefined}
            valid={isFieldValid('password')}
          />
          <PasswordStrength password={formData.password} />
        </div>

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={() => handleBlur('confirmPassword')}
          placeholder="••••••••"
          autoComplete="new-password"
          error={touched.confirmPassword ? fieldErrors.confirmPassword : undefined}
          valid={isFieldValid('confirmPassword')}
        />

        <Input
          label="Referral Code (optional)"
          name="referralCode"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
          placeholder="e.g. ABC12345"
          autoComplete="off"
          error={referralError || undefined}
        />

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary focus-visible:shadow-focus focus-visible:outline-none"
          />
          <label htmlFor="terms" className="text-sm text-textMuted">
            I am 18 or older. I agree to the{' '}
            <Link href="/terms" className="font-medium text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            . I understand RideNDine is a marketplace — food is prepared by independent home
            chefs, not by RideNDine. I will review allergen and ingredient information before
            ordering and contact the chef directly about severe allergies.
          </label>
        </div>

        <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-textMuted">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary transition-colors hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
