'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Button, Input } from '@ridendine/ui';

export default function DriverLoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sign in failed');
        return;
      }

      const redirect = searchParams.get('redirect');
      window.location.assign(redirect || '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0f1923] to-[#1a2d3d] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Image
              src="/logo-icon.png"
              alt="RideNDine"
              width={64}
              height={64}
              className="rounded-2xl"
            />
          </div>
          <h1 className="text-2xl font-bold">
            <span className="text-[#1a9e8e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </h1>
          <p className="mt-1 text-gray-400">Driver Portal</p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900">Welcome back, Driver</h2>
            <p className="mt-1 text-sm text-gray-500">Sign in to start delivering</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@example.com"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#E85D26] hover:bg-[#d44e1e] py-3 text-base font-semibold rounded-xl"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Want to become a driver?{' '}
              <a href="https://ridendine.ca/driver-signup" className="font-medium text-[#E85D26] hover:text-[#d44e1e]">
                Apply here
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} RideNDine. All rights reserved.
        </p>
      </div>
    </div>
  );
}
