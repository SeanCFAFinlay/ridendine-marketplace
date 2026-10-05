/** @type {import('next').NextConfig} */
const { loadRootEnv } = require('../../scripts/load-root-env.cjs');

loadRootEnv(__dirname);

const nextConfig = {
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
 * CI builds are unaffected.
 */
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  dryRun: !process.env.SENTRY_AUTH_TOKEN,
  disableLogger: true,
  widenClientFileUpload: true,
});
