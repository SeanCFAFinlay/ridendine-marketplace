import { describe, expect, it } from 'vitest';
import { decodePolyline, encodePolyline } from '../polyline';
import { computeProgressPct, estimateRemainingSeconds } from '../progress';

describe('polyline', () => {
  it('encode/decode roundtrip', () => {
    const pts = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    const enc = encodePolyline(pts);
    const dec = decodePolyline(enc);
    expect(dec.length).toBe(pts.length);
    for (let i = 0; i < pts.length; i++) {
      expect(dec[i]!.lat).toBeCloseTo(pts[i]!.lat, 4);
      expect(dec[i]!.lng).toBeCloseTo(pts[i]!.lng, 4);
    }
  });
});

describe('computeProgressPct', () => {
  it('returns 0 for empty polyline without NaN', () => {
    expect(computeProgressPct({ lat: 10, lng: 10 }, '')).toBe(0);
    expect(computeProgressPct({ lat: 10, lng: 10 }, '   ')).toBe(0);
  });

  it('clamps between 0 and 100', () => {
    const enc = encodePolyline([
      { lat: 43.65, lng: -79.4 },
      { lat: 43.66, lng: -79.41 },
    ]);
    const p = computeProgressPct({ lat: 43.65, lng: -79.4 }, enc);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(100);
    expect(Number.isNaN(p)).toBe(false);
  });
});

describe('estimateRemainingSeconds', () => {
  it('scales by progress', () => {
    expect(estimateRemainingSeconds(0, 600)).toBe(600);
    expect(estimateRemainingSeconds(50, 600)).toBe(300);
    expect(estimateRemainingSeconds(100, 600)).toBe(0);
  });

  it('clamps progress and handles bad totals', () => {
    expect(estimateRemainingSeconds(150, 100)).toBe(0);
    expect(estimateRemainingSeconds(0, Number.NaN)).toBe(0);
  });
});
