'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Input, Textarea, Card } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import {
  getChefPortalLoginUrl,
  getChefPortalSignupUrl,
} from '@/lib/customer-ordering';

export default function ChefSignupPage() {
  const chefPortalSignup = getChefPortalSignupUrl();
  const chefPortalLogin = getChefPortalLoginUrl();

  const [formData, setFormData] = useState({
    businessName: '',
    cuisineType: '',
    description: '',
    email: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16">
          <Card className="mx-auto max-w-2xl text-center" padding="lg" elevated>
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-successSoft">
              <svg
                className="h-8 w-8 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-text">
              Thank you for your interest!
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-textMuted">
              We&apos;ve received your application and will review it shortly.
              Our team will contact you at {formData.email} within 2-3 business
              days.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/chef-resources">
                <Button variant="secondary">View Chef Resources</Button>
              </Link>
              <Link href="/">
                <Button variant="primary">Return Home</Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-text">
              Become a RideNDine Chef
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-textMuted">
              Share your culinary passion with your community. Fill out the form
              below to start your journey.
            </p>
          </div>

          {chefPortalSignup ? (
            <Card padding="md" className="mb-8">
              <p className="text-sm font-semibold text-text">
                Ready to create your kitchen account?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-textMuted">
                Approved vendors manage menus and orders in the chef portal.
                Use the same email you plan to use on RideNDine.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={chefPortalSignup}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primaryFg transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:shadow-focus"
                >
                  Open chef portal signup
                </a>
                {chefPortalLogin ? (
                  <a
                    href={chefPortalLogin}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-6 py-3 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
                  >
                    Chef login
                  </a>
                ) : null}
              </div>
            </Card>
          ) : (
            <p className="mb-8 rounded-lg border border-warning/30 bg-warningSoft px-4 py-3 text-center text-sm text-warning">
              Set <code className="rounded bg-surface px-1">NEXT_PUBLIC_CHEF_ADMIN_URL</code> in
              environment so the chef portal signup link is available.
            </p>
          )}

          <Card padding="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Business Name"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your kitchen or business name"
                required
                hint="What would you like to call your storefront?"
              />

              <Input
                label="Cuisine Type"
                name="cuisineType"
                value={formData.cuisineType}
                onChange={handleChange}
                placeholder="e.g., Italian, Mexican, Vegan"
                required
                hint="What type of cuisine do you specialize in?"
              />

              <Textarea
                label="Tell us about yourself"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Share your story, cooking experience, and what makes your food special..."
                required
                hint="Min. 50 characters"
                className="min-h-[160px]"
              />

              <div className="grid gap-6 md:grid-cols-2">
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
                  label="Phone Number"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div className="rounded-lg border border-border bg-primarySoft p-4">
                <h3 className="text-sm font-semibold text-text">What&apos;s Next?</h3>
                <ul className="mt-2 space-y-1 text-sm leading-relaxed text-textMuted">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Submit your application</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>We&apos;ll review within 2-3 business days</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Complete verification and onboarding</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">4.</span>
                    <span>Start selling your delicious creations!</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <Link href="/chef-resources">
                  <Button type="button" variant="ghost">
                    View Chef Resources
                  </Button>
                </Link>
                <Button type="submit" variant="primary" size="lg">
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>

          <p className="mt-6 text-center text-sm text-textMuted">
            Already have an account?{' '}
            {chefPortalLogin ? (
              <a
                href={chefPortalLogin}
                className="font-medium text-primary transition-colors hover:underline"
              >
                Chef portal login
              </a>
            ) : (
              <Link
                href="/auth/login"
                className="font-medium text-primary transition-colors hover:underline"
              >
                Customer sign in
              </Link>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
