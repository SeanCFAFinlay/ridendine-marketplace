// ==========================================
// SHARED AUTH MIDDLEWARE FACTORY
// All apps use this to create their middleware.
// Eliminates ~70 lines of duplicated cookie/session logic per app.
// ==========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type CookieOptions = Record<string, unknown>;

export interface AuthMiddlewareConfig {
  /** Routes that don't require authentication */
  publicRoutes: string[];
  /** Route to redirect unauthenticated users to */
  loginRoute: string;
  /** Route to redirect authenticated users to from auth pages (default: '/') */
  authenticatedRedirect?: string;
  /** Auth route prefixes — authenticated users are redirected away from these */
  authRoutes?: string[];
  /** Protected route prefixes — only these routes require auth (if set, default-protect is off) */
  protectedRoutes?: string[];
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  return { supabase, response: () => response };
}

/**
 * Create a configured auth middleware function.
 *
 * Usage in each app's middleware.ts:
 * ```ts
 * import { createAuthMiddleware } from '@ridendine/auth/middleware';
 * export const middleware = createAuthMiddleware({
 *   publicRoutes: ['/auth/login', '/auth/signup'],
 *   loginRoute: '/auth/login',
 * });
 * ```
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig) {
  const {
    publicRoutes,
    loginRoute,
    authenticatedRedirect = '/',
    authRoutes,
    protectedRoutes,
  } = config;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Auth bypass — development only. Crashes in production to prevent accidental deployment.
    if (process.env.BYPASS_AUTH === 'true') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'FATAL: BYPASS_AUTH=true is not allowed in production. ' +
          'Remove BYPASS_AUTH from your production environment variables.'
        );
      }
      return NextResponse.next();
    }

    const { supabase, response } = createSupabaseMiddlewareClient(request);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    const isAuthRoute = authRoutes
      ? authRoutes.some((route) => pathname.startsWith(route))
      : isPublicRoute;

    // Determine if route needs protection
    let needsAuth: boolean;
    if (protectedRoutes) {
      // Selective protection mode (web app): only listed prefixes need auth
      needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
    } else {
      // Default protection mode (admin apps): everything except public routes needs auth
      needsAuth = !isPublicRoute;
    }

    // Redirect to login if accessing protected route without session
    if (needsAuth && !session) {
      const redirectUrl = new URL(loginRoute, request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL(authenticatedRedirect, request.url));
    }

    return response();
  };
}
