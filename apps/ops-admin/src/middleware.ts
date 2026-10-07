import {
  createAuthMiddleware,
  buildContentSecurityPolicy,
} from '@ridendine/auth/middleware';

/**
 * This app previously shipped no Content-Security-Policy at all — only
 * apps/web had one. Leaflet live map (apps/ops-admin/src/components/map/live-map.tsx) renders OSM tiles.
 */
const cspBuilder = (nonce: string) => buildContentSecurityPolicy(nonce, { maps: true });

export const middleware = createAuthMiddleware({
  publicRoutes: [
    '/auth/login',
    '/api/health',
    '/api/engine/processors',
    // Processor-token-gated (not session-auth); the route validates the token.
    '/api/engine/partner-stats',
    '/api/ops/live-board',
    // E2E walkthrough fix — without these, fresh-session POSTs to
    // /api/auth/login returned 307 from the default-protect middleware,
    // chicken-and-egg blocking the very first login.
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/forgot-password',
  ],
  loginRoute: '/auth/login',
  cspBuilder,
  authenticatedRedirect: '/dashboard',
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
