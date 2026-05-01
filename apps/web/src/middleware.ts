import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: ['/auth/login', '/auth/signup'],
  authRoutes: ['/auth/login', '/auth/signup'],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/chefs',
  /** OPTION A (Phase 2 / IRR-002): checkout requires authenticated customer session */
  protectedRoutes: ['/account', '/checkout'],
});

export const config = {
  matcher: ['/account/:path*', '/checkout/:path*', '/auth/login', '/auth/signup'],
};
