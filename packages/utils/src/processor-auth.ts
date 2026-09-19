// ==========================================
// ENGINE / CRON PROCESSOR AUTH (Phase 15 / IRR-006)
// No Next.js dependency — pass request.headers only.
// ==========================================

import { timingSafeEqual } from 'crypto';

function safeEqual(a: string | null, b: string | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Validates Vercel Cron `Authorization: Bearer CRON_SECRET` or
 * `x-processor-token: ENGINE_PROCESSOR_TOKEN`.
 * Fail closed when neither env var is configured.
 */
export function validateEngineProcessorHeaders(headers: Headers): boolean {
  const vercelSecret = process.env.CRON_SECRET;
  const authHeader = headers.get('authorization');
  const bearer = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? null;
  if (safeEqual(bearer, vercelSecret)) {
    return true;
  }

  const token = headers.get('x-processor-token');
  const expected = process.env.ENGINE_PROCESSOR_TOKEN;
  if (!expected && !vercelSecret) {
    return false;
  }
  return safeEqual(token, expected);
}
