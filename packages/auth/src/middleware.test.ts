// ==========================================
// AUTH MIDDLEWARE TESTS
// Tests for createAuthMiddleware factory
// ==========================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock next/server — hoisted before any imports
vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn((_opts?: unknown) => ({ type: 'next' })),
    redirect: vi.fn((url: URL) => ({ type: 'redirect', url: url.toString() })),
  };
  return { NextResponse };
});

// Mock @supabase/ssr — default: no session
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => makeSupabaseClient(null)),
}));

// Import mocked modules at module scope so the same instances are used throughout
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAuthMiddleware } from './middleware';

function makeSupabaseClient(session: unknown) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session } }),
    },
  };
}

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
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default: no session
    vi.mocked(createServerClient).mockImplementation(() => makeSupabaseClient(null) as any);
    process.env = { ...originalEnv };
    delete process.env.BYPASS_AUTH;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ---- BYPASS_AUTH guard ----

  it('throws in production when BYPASS_AUTH=true', async () => {
    process.env.BYPASS_AUTH = 'true';
    process.env.NODE_ENV = 'production';

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    await expect(middleware(request)).rejects.toThrow(
      'BYPASS_AUTH=true is not allowed in production'
    );
  });

  it('allows bypass in development — returns next() immediately', async () => {
    process.env.BYPASS_AUTH = 'true';
    process.env.NODE_ENV = 'development';

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);
    expect((result as any).type).toBe('next');
  });

  // ---- Public routes ----

  it('allows public routes without session — does not redirect to login', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);

    // Must not be a redirect to the login route
    expect(result).toBeDefined();
    if ((result as any).type === 'redirect') {
      expect((result as any).url).not.toContain('/auth/login');
    }
  });

  it('allows a nested public route path without redirect', async () => {
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
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/dashboard');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  it('adds redirect query param when bouncing unauthenticated user', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
    });

    const request = createMockRequest('/orders/123');
    const result = await middleware(request);

    const resultUrl = (result as any).url as string;
    expect(resultUrl).toContain('redirect=');
    // Pathname is URL-encoded in the query string
    expect(decodeURIComponent(resultUrl)).toContain('/orders/123');
  });

  // ---- Auth routes — authenticated users redirected away ----

  it('redirects authenticated user away from auth routes to authenticatedRedirect', async () => {
    // Set up a session for this test
    vi.mocked(createServerClient).mockImplementation(
      () => makeSupabaseClient({ user: { id: 'user-abc' } }) as any
    );

    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      authRoutes: ['/auth'],
      authenticatedRedirect: '/dashboard',
    });

    const request = createMockRequest('/auth/login');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/dashboard');
    expect(NextResponse.redirect).toHaveBeenCalled();
  });

  // ---- Selective protection mode (protectedRoutes) ----

  it('allows unauthenticated user on non-protected route in selective mode', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    // '/' is not in protectedRoutes — should pass through without redirect
    const request = createMockRequest('/');
    const result = await middleware(request);

    expect((result as any).type).not.toBe('redirect');
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated user on protected route in selective mode', async () => {
    const middleware = createAuthMiddleware({
      publicRoutes: ['/auth/login'],
      loginRoute: '/auth/login',
      protectedRoutes: ['/account', '/orders'],
    });

    const request = createMockRequest('/account/settings');
    const result = await middleware(request);

    expect((result as any).type).toBe('redirect');
    expect((result as any).url).toContain('/auth/login');
  });
});
