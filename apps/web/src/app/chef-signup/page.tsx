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
      <div className="min-h-screen bg-[#FAFAFA]">
        <Header />
        <main className="container py-16">
          <Card className="mx-auto max-w-2xl text-center" padding="lg">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-[28px] font-semibold leading-tight text-[#2D3436]">
              Thank you for your interest!
            </h2>
            <p className="mt-3 text-[17px] leading-[1.6] text-[#5F6368]">
              We&apos;ve received your application and will review it shortly.
              Our team will contact you at {formData.email} within 2-3 business
              days.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link href="/chef-resources">
                <Button variant="outline">View Chef Resources</Button>
              </Link>
              <Link href="/">
                <Button>Return Home</Button>
              </Link>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Header />

      <main className="container py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="text-[40px] font-bold leading-tight tracking-tight text-[#2D3436]">
              Become a Ridendine Chef
            </h1>
            <p className="mt-4 text-[17px] leading-[1.6] text-[#5F6368]">
              Share your culinary passion with your community. Fill out the form
              below to start your journey.
            </p>
          </div>

          {chefPortalSignup ? (
            <Card padding="md" className="mb-8 border border-[#E8E8E8] bg-white">
              <p className="text-[15px] font-semibold text-[#2D3436]">
                Ready to create your kitchen account?
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#5F6368]">
                Approved vendors manage menus and orders in the chef portal.
                Use the same email you plan to use on Ridendine.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={chefPortalSignup}
                  className="inline-flex items-center justify-center rounded-md bg-[#FF6B6B] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#FF5252]"
                >
                  Open chef portal signup
                </a>
                {chefPortalLogin ? (
                  <a
                    href={chefPortalLogin}
                    className="inline-flex items-center justify-center rounded-md border border-[#E8E8E8] bg-white px-6 py-3 text-sm font-medium text-[#2D3436] transition-colors hover:bg-[#FAFAFA]"
                  >
                    Chef login
                  </a>
                ) : null}
              </div>
            </Card>
          ) : (
            <p className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
              Set <code className="rounded bg-white px-1">NEXT_PUBLIC_CHEF_ADMIN_URL</code> in
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

              <div className="rounded-lg border border-[#E8E8E8] bg-[#FFF8F0] p-4">
                <h3 className="text-[15px] font-semibold text-[#2D3436]">
                  What&apos;s Next?
                </h3>
                <ul className="mt-2 space-y-1 text-[15px] leading-[1.6] text-[#5F6368]">
                  <li className="flex gap-2">
                    <span className="text-[#FF6B6B]">1.</span>
                    <span>Submit your application</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#FF6B6B]">2.</span>
                    <span>We&apos;ll review within 2-3 business days</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#FF6B6B]">3.</span>
                    <span>Complete verification and onboarding</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[#FF6B6B]">4.</span>
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
                <Button
                  type="submit"
                  size="lg"
                  className="bg-[#FF6B6B] hover:bg-[#FF5252]"
                >
                  Submit Application
                </Button>
              </div>
            </form>
          </Card>

          <p className="mt-6 text-center text-[15px] text-[#5F6368]">
            Already have an account?{' '}
            {chefPortalLogin ? (
              <a
                href={chefPortalLogin}
                className="font-medium text-[#FF6B6B] hover:text-[#FF5252]"
              >
                Chef portal login
              </a>
            ) : (
              <Link
                href="/auth/login"
                className="font-medium text-[#FF6B6B] hover:text-[#FF5252]"
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
