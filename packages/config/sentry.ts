// Shared Sentry configuration for all Ridendine apps
// Only active when NEXT_PUBLIC_SENTRY_DSN is set

export const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || 'development',
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Don't send in development unless DSN is explicitly set
  beforeSend(event: any) {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return null;
    return event;
  },
};
