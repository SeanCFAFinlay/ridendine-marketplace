// ==========================================
// SENTRY REGISTRATION (Next.js instrumentation hook)
//
// Without this file the sentry.server/edge config modules are never imported
// and Sentry never initialises — the SDK was a dependency, not a monitor.
// `experimental.instrumentationHook` in next.config.js enables this on Next 14.
//
// Each config module is a no-op unless NEXT_PUBLIC_SENTRY_DSN is set, so this
// is safe in local development and CI.
// ==========================================

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}
