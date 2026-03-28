'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Ridendine</h1>
          <p className="mt-2 text-gray-400">Operations Admin Portal</p>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-8">
          <h2 className="text-xl font-semibold text-white text-center mb-6">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ridendine.com"
                required
                className="bg-[#1e293b] border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1"
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
                className="bg-[#1e293b] border-gray-700 text-white placeholder-gray-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#E85D26] hover:bg-[#D04D16]"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Access restricted to authorized personnel only.
          </p>
        </Card>

        <p className="mt-8 text-center text-xs text-gray-600">
          &copy; {new Date().getFullYear()} Ridendine. All rights reserved.
        </p>
      </div>
    </div>
  );
}
