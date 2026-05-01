import { describe, expect, it } from 'vitest';
import { healthPayload, methodNotAllowed, unauthorized } from './api-response';

describe('api-response', () => {
  it('healthPayload matches IRR-036 standard fields', () => {
    const h = healthPayload('web');
    expect(h.ok).toBe(true);
    expect(h.service).toBe('web');
    expect(typeof h.timestamp).toBe('string');
    expect(h.checks.app).toBe('ok');
    expect(typeof h.version).toBe('string');
    expect(['development', 'test', 'production']).toContain(h.environment);
  });

  it('methodNotAllowed returns 405', async () => {
    const res = methodNotAllowed();
    expect(res.status).toBe(405);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });

  it('unauthorized returns 401 envelope', async () => {
    const res = unauthorized('no session');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});
