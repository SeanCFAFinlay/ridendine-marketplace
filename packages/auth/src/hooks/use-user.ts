'use client';

import { useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { createBrowserClient } from '@ridendine/db';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useUser(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createBrowserClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function useSession(): Session | null {
  const { session } = useUser();
  return session;
}

export function useIsAuthenticated(): boolean {
  const { user, loading } = useUser();
  return !loading && user !== null;
}
