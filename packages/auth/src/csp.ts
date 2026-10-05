// ==========================================
// SHARED CONTENT-SECURITY-POLICY BUILDER
//
// Previously only apps/web built a CSP. chef-admin, ops-admin and driver-app
// shipped every other security header but no CSP at all — meaning the
// highest-privilege surface in the platform (the ops console, where a
// super-admin can move money) had the weakest script-injection defence, while
// the anonymous marketplace had the strongest. This module closes that gap
// with one implementation the four apps share.
//
// Design notes:
//  - script-src uses a per-request nonce + 'strict-dynamic', so no
//    'unsafe-inline' and no 'unsafe-eval' outside development.
//  - style-src keeps 'unsafe-inline': Next.js injects inline styles, and
//    inline *style* injection is far lower risk than inline script.
//  - Every extra origin below is justified by a real asset in that app. Adding
//    an origin here is a security decision — cite the code that needs it.
// ==========================================

export interface CspOptions {
  /** Allow Stripe.js + its iframe (checkout, Connect onboarding). */
  stripe?: boolean;
  /** Allow OpenStreetMap raster tiles (Leaflet maps). */
  maps?: boolean;
  /** Allow Leaflet marker images + stylesheet served from cdnjs. */
  cdnjsLeaflet?: boolean;
  /** Allow @vercel/analytics + speed-insights. */
  vercelAnalytics?: boolean;
}

/**
 * Build a per-request CSP string.
 *
 * @param nonce  Per-request nonce, also injected as the `x-nonce` request
 *               header so Next.js can nonce its own inline bootstrap scripts.
 */
export function buildContentSecurityPolicy(nonce: string, options: CspOptions = {}): string {
  const isDev = process.env.NODE_ENV !== 'production';

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    // Ignored by modern browsers when 'strict-dynamic' is present; kept as a
    // fallback for older browsers that do not support strict-dynamic.
    options.stripe ? 'js.stripe.com' : '',
    options.vercelAnalytics ? 'va.vercel-scripts.com' : '',
    // Next.js dev tooling needs eval; never allowed in production.
    isDev ? "'unsafe-eval'" : '',
  ].filter(Boolean);

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    '*.supabase.co',
    'images.unsplash.com',
    options.maps ? '*.tile.openstreetmap.org' : '',
    options.cdnjsLeaflet ? 'cdnjs.cloudflare.com' : '',
  ].filter(Boolean);

  const styleSrc = [
    "'self'",
    "'unsafe-inline'",
    options.cdnjsLeaflet ? 'cdnjs.cloudflare.com' : '',
  ].filter(Boolean);

  const connectSrc = [
    "'self'",
    '*.supabase.co',
    // Supabase Realtime is a WebSocket; without this every live update fails.
    'wss://*.supabase.co',
    options.stripe ? 'api.stripe.com' : '',
    '*.sentry.io',
    options.vercelAnalytics ? 'vitals.vercel-insights.com' : '',
    options.vercelAnalytics ? '*.vercel-insights.com' : '',
    options.maps ? '*.tile.openstreetmap.org' : '',
    // Geocoding + routing are called server-side, but the ETA surface can also
    // resolve routes from the client on the driver map.
    options.maps ? 'router.project-osrm.org' : '',
  ].filter(Boolean);

  const frameSrc = [options.stripe ? 'js.stripe.com' : "'none'"].filter(Boolean);

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    `style-src ${styleSrc.join(' ')}`,
    `img-src ${imgSrc.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}
