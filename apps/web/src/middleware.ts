import { createAuthMiddleware } from '@ridendine/auth/middleware';

export const middleware = createAuthMiddleware({
  publicRoutes: ['/auth/login', '/auth/signup'],
  authRoutes: ['/auth/login', '/auth/signup'],
  loginRoute: '/auth/login',
  authenticatedRedirect: '/chefs',
  protectedRoutes: ['/account'],
});

export const config = {
  matcher: ['/account/:path*', '/auth/login', '/auth/signup'],
};
