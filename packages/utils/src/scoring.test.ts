import { describe, expect, it } from 'vitest';
import { scoreDriverForDispatch } from './scoring';
import { calculateDistanceKm, extractAreaFromAddress } from './geo';

describe('scoreDriverForDispatch', () => {
  const defaultRules = { dispatchRadiusKm: 10 };

  it('scores closer driver higher than farther', () => {
    const close = scoreDriverForDispatch(
      { distanceKm: 2, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    const far = scoreDriverForDispatch(
      { distanceKm: 8, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    expect(close).toBeGreaterThan(far);
  });

  it('penalizes busy drivers', () => {
    const online = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    const busy = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'busy' },
      defaultRules
    );
    expect(online).toBeGreaterThan(busy);
  });

  it('penalizes high workload', () => {
    const idle = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    const loaded = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 3, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    expect(idle).toBeGreaterThan(loaded);
  });

  it('penalizes recent declines and expiries', () => {
    const reliable = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 0, recentDeclines: 0, recentExpiries: 0, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    const unreliable = scoreDriverForDispatch(
      { distanceKm: 5, activeDeliveries: 0, recentDeclines: 3, recentExpiries: 2, fairnessScore: 1, status: 'online' },
      defaultRules
    );
    expect(reliable).toBeGreaterThan(unreliable);
  });
});

describe('calculateDistanceKm', () => {
  it('returns null if any coordinate is missing', () => {
    expect(calculateDistanceKm(null, null, 43.25, -79.87)).toBeNull();
    expect(calculateDistanceKm(43.25, -79.87, null, null)).toBeNull();
  });

  it('returns 0 for same point', () => {
    const dist = calculateDistanceKm(43.2557, -79.8711, 43.2557, -79.8711);
    expect(dist).toBeCloseTo(0, 1);
  });

  it('calculates Hamilton to Toronto (~68 km)', () => {
    const dist = calculateDistanceKm(43.2557, -79.8711, 43.6532, -79.3832);
    expect(dist).toBeGreaterThan(50);
    expect(dist).toBeLessThan(90);
  });
});

describe('extractAreaFromAddress', () => {
  it('returns second segment of comma-separated address', () => {
    expect(extractAreaFromAddress('123 Main St, Hamilton, ON')).toBe('Hamilton');
  });

  it('returns first segment if only one', () => {
    expect(extractAreaFromAddress('Hamilton')).toBe('Hamilton');
  });

  it('returns Unknown for null/empty', () => {
    expect(extractAreaFromAddress(null)).toBe('Unknown');
    expect(extractAreaFromAddress(undefined)).toBe('Unknown');
    expect(extractAreaFromAddress('')).toBe('Unknown');
  });
});
