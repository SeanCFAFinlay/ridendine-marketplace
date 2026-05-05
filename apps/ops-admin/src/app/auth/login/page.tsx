'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createBrowserClient } from '@ridendine/db';
import { Button, Card, Input } from '@ridendine/ui';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserClient();
      if (!supabase) {
        throw new Error('Unable to connect to authentication service');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-opsPanel to-opsPanel flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/logo-icon.png"
              alt="RideNDine"
              width={72}
              height={72}
              className="h-auto w-16 rounded-2xl shadow-lg"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold">
            <span className="text-[#1a7a6e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#E85D26]/20 px-3 py-1 text-xs font-semibold text-[#E85D26]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Operations Admin Portal
          </div>
        </div>

        <Card className="border-gray-700/50 bg-opsPanel/80 backdrop-blur-sm p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ridendine.ca"
                required
                className="bg-[#1e293b] border-gray-600 text-white placeholder-gray-500 focus:border-[#E85D26]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="bg-[#1e293b] border-gray-600 text-white placeholder-gray-500 focus:border-[#E85D26]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#E85D26] hover:bg-[#D04D16] text-white font-semibold"
              size="lg"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Access restricted to authorized RideNDine personnel only.
          </p>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} RideNDine. All rights reserved.
        </p>
      </div>
    </div>
  );
}
