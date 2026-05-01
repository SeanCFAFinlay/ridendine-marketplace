import { describe, expect, it } from 'vitest';
import { isPlausibleClientIsoTime } from './location-client-time';

describe('isPlausibleClientIsoTime', () => {
  it('accepts now-ish ISO timestamps', () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const iso = new Date(now).toISOString();
    expect(isPlausibleClientIsoTime(iso, now)).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(isPlausibleClientIsoTime('not-a-date', Date.now())).toBe(false);
  });

  it('rejects timestamps far in the past', () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const old = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    expect(isPlausibleClientIsoTime(old, now, 15 * 60 * 1000)).toBe(false);
  });

  it('rejects timestamps far in the future', () => {
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const future = new Date(now + 2 * 60 * 60 * 1000).toISOString();
    expect(isPlausibleClientIsoTime(future, now, 15 * 60 * 1000)).toBe(false);
  });
});
