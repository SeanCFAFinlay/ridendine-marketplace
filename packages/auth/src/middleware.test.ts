// ==========================================
// AUTH MIDDLEWARE TESTS
// Tests for createAuthMiddleware factory
// ==========================================

import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock next/server before any imports
vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn((_opts?: unknown) => ({ type: 'next' })),
    redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
  };
  return { NextResponse };
});

// Mock @supabase/ssr — session is null by default
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  })),
}));

function createMockRequest(pathname: string) {
  const url = new URL(`http://localhost:3000${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(),
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
    },
  } as any;
}

describe('createAuthMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.BYPASS_AUTH;
    delete (process.env as any).NODE_ENV;
  });

  // ---- BYPASS_AUTH guard ----

  it('throws in production when BYPASS_AUTH=true', async () => {
    process.env.BYPASS_AUTH = 'true';
    (process.env as any).NODE_ENV = 'production';

    const { createAuthMiddleware } = await import('./middleware');
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    await expect(middleware(request)).rejects.toThrow(
      'BYPASS_AUTH=true is not allowed in production'
    );
  });

  it('allows bypass in development without calling Supabase', async () => {
    process.env.BYPASS_AUTH = 'true';
    (process.env as any).NODE_ENV = 'development';

    const { createAuthMiddleware } = await import('./middleware');
    const { NextResponse } = await import('next/server');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);
    expect(result).toEqual({ type: 'next' });
    expect(NextResponse.next).toHaveBeenCalled();
  });

  // ---- Public routes ----

  it('allows public routes without session — does not redirect', async () => {
    const { createAuthMiddleware } = await import('./middleware');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);
    // Result must be truthy; specifically must NOT be a redirect to login
    expect(result).toBeDefined();
    if ((result as any).type === 'redirect') {
      expect((result as any).url).not.toContain('/auth/login');
    }
  });

  it('allows a nested public route path', async () => {
    const { createAuthMiddleware } = await import('./middleware');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/auth/signup');
    const result = await middleware(request);
    expect(result).toBeDefined();
    if ((result as any).type === 'redirect') {
      expect((result as any).url).not.toContain('/auth/login');
    }
  });

  // ---- Protected routes (default protection mode) ----

  it('redirects unauthenticated user accessing protected route to login', async () => {
    const { createAuthMiddleware } = await import('./middleware');
    const { NextResponse } = await import('next/server');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
  });

  it('adds redirect query param when bouncing unauthenticated user', async () => {
    const { createAuthMiddleware } = await import('./middleware');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/orders/123');
    const result = await middleware(request);

    const resultUrl = (result as any).url as string;
    expect(resultUrl).toContain('redirect=');
    // The pathname is URL-encoded in the query string
    expect(decodeURIComponent(resultUrl)).toContain('/orders/123');
  });

  // ---- Auth routes — authenticated users redirected away ----

  it('redirects authenticated user away from auth routes', async () => {
    // Override @supabase/ssr to return a session for this test
    const { createServerClient } = await import('@supabase/ssr');
    (createServerClient as any).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-abc' } } },
        }),
      },
    });

    const { createAuthMiddleware } = await import('./middleware');
    const { NextResponse } = await import('next/server');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      authRoutes: ['/auth'],
      authenticatedRedirect: '/dashboard',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalled();
    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/dashboard');
  });

  // ---- Selective protection mode (protectedRoutes) ----

  it('allows unauthenticated user on non-protected route in selective mode', async () => {
    const { createAuthMiddleware } = await import('./middleware');
    const { NextResponse } = await import('next/server');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    // '/' is not in protectedRoutes — should pass through
    const request = createMockRequest('/');
    await middleware(request);

    // Should NOT have called redirect
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated user on protected route in selective mode', async () => {
    const { createAuthMiddleware } = await import('./middleware');

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    const request = createMockRequest('/account/settings');
    const result = await middleware(request);

    // Middleware must redirect (type = 'redirect') to the login route
    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
  });
});
