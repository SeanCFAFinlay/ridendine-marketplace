// ==========================================
// API RESPONSE ALIASES + HEALTH ENVELOPE (Phase 4)
// Core builders live in ./api.ts — this module adds naming aliases + IRR-036 health shape.
// ==========================================

import { apiSuccess, apiError, api401, api403, api500 } from './api';

/** 200 with `{ success: true, data }` envelope */
export function ok<T>(data: T, status = 200): Response {
  return apiSuccess(data, status);
}

export function badRequest(message: string, details?: Record<string, unknown>): Response {
  return apiError('BAD_REQUEST', message, 400, details);
}

export function unauthorized(message = 'Authentication required'): Response {
  return api401(message);
}

export function forbidden(message = 'Forbidden'): Response {
  return api403(message);
}

export function notFound(message = 'Resource not found'): Response {
  return apiError('NOT_FOUND', message, 404);
}

export function serverError(message = 'Internal server error', details?: Record<string, unknown>): Response {
  return apiError('INTERNAL_ERROR', message, 500, details);
}

export function validationError(fields: Record<string, string[]>): Response {
  return apiError('VALIDATION_ERROR', 'Validation failed', 400, { fields });
}

export function methodNotAllowed(): Response {
  return apiError('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export type HealthServiceName = 'web' | 'chef-admin' | 'ops-admin' | 'driver-app';

/** Standard health `data` payload (wrapped by `apiSuccess` → `{ success, data }`). */
export interface StandardHealthPayload {
  ok: true;
  service: HealthServiceName;
  timestamp: string;
  version: string;
  environment: string;
  checks: { app: 'ok' };
  /** Optional; retained for backward compatibility with older health clients */
  uptimeSeconds?: number;
}

export type HealthReadiness = 'ready' | 'degraded' | 'not_ready';

export interface OperationalHealthPayload extends StandardHealthPayload {
  readiness: HealthReadiness;
  checks: {
    app: 'ok';
    db: 'ok' | 'degraded' | 'not_ready';
    env: 'ok' | 'degraded' | 'not_ready';
    stripe: 'ok' | 'degraded' | 'not_ready' | 'not_applicable';
    rateLimit: 'ok' | 'degraded' | 'not_ready';
    checkoutIdempotencyMigration: 'ok' | 'degraded' | 'not_applicable';
  };
  details: {
    rateLimitProvider: string;
    rateLimitReason?: string;
    buildSha?: string;
  };
}

export function healthPayload(service: HealthServiceName): StandardHealthPayload {
  return {
    ok: true,
    service,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: { app: 'ok' },
    uptimeSeconds: process.uptime(),
  };
}

export function operationalHealthPayload(params: {
  service: HealthServiceName;
  dbReady: boolean;
  envReady: boolean;
  stripeReady: boolean | null;
  rateLimitReady: boolean;
  rateLimitProvider: string;
  rateLimitReason?: string;
  checkoutIdempotencyMigrationApplied?: boolean | null;
}): OperationalHealthPayload {
  const base = healthPayload(params.service);
  const stripeStatus =
    params.stripeReady === null ? 'not_applicable' : params.stripeReady ? 'ok' : 'not_ready';
  const checkoutMigration =
    params.checkoutIdempotencyMigrationApplied == null
      ? 'not_applicable'
      : params.checkoutIdempotencyMigrationApplied
        ? 'ok'
        : 'degraded';
  const checks: OperationalHealthPayload['checks'] = {
    app: 'ok',
    db: params.dbReady ? 'ok' : 'not_ready',
    env: params.envReady ? 'ok' : 'not_ready',
    stripe: stripeStatus,
    rateLimit: params.rateLimitReady ? 'ok' : 'degraded',
    checkoutIdempotencyMigration: checkoutMigration,
  };

  const readiness: HealthReadiness =
    checks.db === 'ok' && checks.env === 'ok' && checks.stripe !== 'not_ready'
      ? checks.rateLimit === 'ok'
        ? 'ready'
        : 'degraded'
      : 'not_ready';

  return {
    ...base,
    readiness,
    checks,
    details: {
      rateLimitProvider: params.rateLimitProvider,
      rateLimitReason: params.rateLimitReason,
      buildSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
    },
  };
}
