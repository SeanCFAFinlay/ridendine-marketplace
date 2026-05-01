// ==========================================
// ENGINE / CRON PROCESSOR AUTH (Phase 15 / IRR-006)
// No Next.js dependency — pass request.headers only.
// ==========================================

/**
 * Validates Vercel Cron `Authorization: Bearer CRON_SECRET` or
 * `x-processor-token: ENGINE_PROCESSOR_TOKEN`.
 * Fail closed when neither env var is configured.
 */
export function validateEngineProcessorHeaders(headers: Headers): boolean {
  const vercelSecret = process.env.CRON_SECRET;
  const authHeader = headers.get('authorization');
  if (vercelSecret && authHeader === `Bearer ${vercelSecret}`) {
    return true;
  }

  const token = headers.get('x-processor-token');
  const expected = process.env.ENGINE_PROCESSOR_TOKEN;
  if (!expected && !vercelSecret) {
    return false;
  }
  return !!expected && token === expected;
}
