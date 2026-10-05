// ==========================================
// SHARED AUTH MIDDLEWARE FACTORY
// All apps use this to create their middleware.
// Eliminates ~70 lines of duplicated cookie/session logic per app.
// ==========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export { buildContentSecurityPolicy, type CspOptions } from './csp';

type CookieOptions = Record<string, unknown>;
type CookieToSet = {
  name: string;
  value: string;
  options?: CookieOptions;
};

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
  /**
   * Optional per-request Content-Security-Policy builder. When provided, a
   * fresh nonce is generated per request, injected into the request headers as
   * `x-nonce` + `Content-Security-Policy` (so Next.js applies the nonce to its
   * own inline scripts), and the returned CSP string is set on every response.
   * This lets a CSP drop `'unsafe-inline'`/`'unsafe-eval'` for scripts.
   */
  cspBuilder?: (nonce: string) => string;
}

function createSupabaseMiddlewareClient(request: NextRequest, requestHeaders: Headers) {
  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
          });
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );

  return { supabase, response: () => response };
}

function isDefaultAuthRoute(pathname: string, publicRoutes: string[]) {
  return publicRoutes
    .filter((route) => route === '/auth' || route.startsWith('/auth/'))
    .some((route) => pathname.startsWith(route));
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
    cspBuilder,
  } = config;

  return async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Build per-request CSP context (nonce + header) when configured. The
    // augmented request headers are forwarded to the renderer so Next.js can
    // nonce its own inline scripts.
    const requestHeaders = new Headers(request.headers);
    let csp: string | undefined;
    if (cspBuilder) {
      const nonce = btoa(crypto.randomUUID());
      csp = cspBuilder(nonce);
      requestHeaders.set('x-nonce', nonce);
      requestHeaders.set('Content-Security-Policy', csp);
    }
    const withCsp = <T extends NextResponse>(res: T): T => {
      if (csp) res.headers.set('Content-Security-Policy', csp);
      return res;
    };

    // Dev autologin — opt-in shortcut for local development only.
    // Never honored in production regardless of env value.
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_DEV_AUTOLOGIN === 'true'
    ) {
      return withCsp(NextResponse.next({ request: { headers: requestHeaders } }));
    }

    const { supabase, response } = createSupabaseMiddlewareClient(request, requestHeaders);

    // SECURITY: use getUser() — it verifies the JWT against the Supabase Auth
    // server. getSession() only decodes the cookie locally, which a client can
    // spoof; it must never be the basis of the protect/redirect decision.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
    const isAuthRoute = authRoutes
      ? authRoutes.some((route) => pathname.startsWith(route))
      : isDefaultAuthRoute(pathname, publicRoutes);

    // Determine if route needs protection
    let needsAuth: boolean;
    if (protectedRoutes) {
      // Selective protection mode (web app): only listed prefixes need auth
      needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
    } else {
      // Default protection mode (admin apps): everything except public routes needs auth
      needsAuth = !isPublicRoute;
    }

    // Redirect to login if accessing protected route without a verified user
    if (needsAuth && !user) {
      const redirectUrl = new URL(loginRoute, request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return withCsp(NextResponse.redirect(redirectUrl));
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && user) {
      return withCsp(NextResponse.redirect(new URL(authenticatedRedirect, request.url)));
    }

    return withCsp(response());
  };
}
