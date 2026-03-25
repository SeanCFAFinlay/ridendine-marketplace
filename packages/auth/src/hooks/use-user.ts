'use client';

import { useEffect, useState, useMemo } from 'react';
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

  const supabase = useMemo(() => createBrowserClient(), []);

  useEffect(() => {
    if (!supabase) {
      setState({
        user: null,
        session: null,
        loading: false,
      });
      return;
    }

    const db = supabase;

    // Get initial session
    db.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

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
