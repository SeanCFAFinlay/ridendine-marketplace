import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import type { User } from '@supabase/supabase-js';

/**
 * Get the current user from the server-side session.
 * Use this in Server Components and API routes.
 */
export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const supabase = createServerClient({
    get: (name: string) => {
      const cookie = cookieStore.get(name);
      return cookie ? { value: cookie.value } : undefined;
    },
    set: (name: string, value: string, options?: object) => {
      try {
        cookieStore.set(name, value, options);
      } catch {
        // Server component context
      }
    },
    delete: (name: string) => {
      try {
        cookieStore.delete(name);
      } catch {
        // Server component context
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Require authentication - throws redirect if not authenticated.
 * Use this in Server Components that require authentication.
 */
export async function requireAuth(): Promise<User> {
  const user = await getServerUser();

  if (!user) {
    // In a real app, you'd use redirect() from next/navigation
    throw new Error('Unauthorized');
  }

  return user;
}

/**
 * Check if request is authenticated without throwing.
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}
