/** @type {import('next').NextConfig} */
const { loadRootEnv } = require('../../scripts/load-root-env.cjs');

loadRootEnv(__dirname);

const nextConfig = {
  // Don't advertise the framework (was leaking `X-Powered-By: Next.js`).
  poweredByHeader: false,
  // Required on Next 14 for instrumentation.ts to load — this is what makes
  // Sentry actually initialise on the server and edge runtimes.
  experimental: { instrumentationHook: true },
  transpilePackages: [
    '@ridendine/db',
    '@ridendine/ui',
    '@ridendine/auth',
    '@ridendine/types',
    '@ridendine/utils',
    '@ridendine/validation',
    '@ridendine/engine',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          // NOTE: Content-Security-Policy is set per-request in src/middleware.ts
          // so it can include a unique nonce (removes the previous
          // 'unsafe-inline' / 'unsafe-eval' script weakness).
        ],
      },
    ];
  },
};

const { withSentryConfig } = require('@sentry/nextjs');

/**
 * Sentry was previously installed and configured but never wired in, so no
 * error ever reached it. withSentryConfig loads sentry.client.config.ts into
 * the browser bundle; instrumentation.ts loads the server + edge configs.
 *
 * Source-map upload only runs when SENTRY_AUTH_TOKEN is present, so local and
 * CI builds are unaffected. `silent` keeps build logs clean.
 */
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Skip the upload step entirely when there is no token (local, CI, previews).
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  widenClientFileUpload: true,
});
