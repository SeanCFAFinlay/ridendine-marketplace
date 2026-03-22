'use client';

import { useCallback, useState, useEffect } from 'react';
import { createBrowserClient } from '@ridendine/db';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null);

  // Initialize client only on the client side
  useEffect(() => {
    const client = createBrowserClient();
    setSupabase(client);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) {
        return { success: false, error: 'Auth not initialized' };
      }

      setLoading(true);
      setError(null);

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign in failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const signUp = useCallback(
    async (email: string, password: string, metadata?: Record<string, unknown>) => {
      if (!supabase) {
        return { success: false, error: 'Auth not initialized' };
      }

      setLoading(true);
      setError(null);

      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        });

        if (error) {
          setError(error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sign up failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return { success: false, error: 'Auth not initialized' };
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign out failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string) => {
      if (!supabase) {
        return { success: false, error: 'Auth not initialized' };
      }

      setLoading(true);
      setError(null);

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) {
          setError(error.message);
          return { success: false, error: error.message };
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Password reset failed';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    signIn,
    signUp,
    signOut,
    resetPassword,
    loading,
    error,
  };
}
