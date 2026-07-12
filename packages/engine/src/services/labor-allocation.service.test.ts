import { describe, it, expect } from 'vitest';
import { allocateLaborByOrderCount } from './labor-allocation.service';

const A = 'aaaa0000-0000-4000-8000-000000000001';
const B = 'bbbb0000-0000-4000-8000-000000000002';
const C = 'cccc0000-0000-4000-8000-000000000003';

const sum = (rows: { amount: number }[]) => Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100;

describe('allocateLaborByOrderCount', () => {
  it('splits proportionally to order count', () => {
    const rows = allocateLaborByOrderCount(100, [
      { storefrontId: A, orderCount: 3 },
      { storefrontId: B, orderCount: 1 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 75 },
      { storefrontId: B, amount: 25 },
    ]);
  });

  it('apportions exactly to the total with no rounding drift (largest remainder)', () => {
    // $100 across three equal brands cannot split evenly in cents (33.33·3=99.99);
    // the leftover cent must land somewhere so the total is exactly $100.
    const rows = allocateLaborByOrderCount(100, [
      { storefrontId: A, orderCount: 1 },
      { storefrontId: B, orderCount: 1 },
      { storefrontId: C, orderCount: 1 },
    ]);
    expect(sum(rows)).toBe(100);
    const amounts = rows.map((r) => r.amount).sort();
    expect(amounts).toEqual([33.33, 33.33, 33.34]);
  });

  it('gives the leftover cent to the largest fractional remainder', () => {
    // total 10.00 → cents 1000; weights 2/1 → A exact 666.67, B 333.33.
    const rows = allocateLaborByOrderCount(10, [
      { storefrontId: A, orderCount: 2 },
      { storefrontId: B, orderCount: 1 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 6.67 },
      { storefrontId: B, amount: 3.33 },
    ]);
    expect(sum(rows)).toBe(10);
  });

  it('attributes nothing when a brand sold nothing', () => {
    const rows = allocateLaborByOrderCount(80, [
      { storefrontId: A, orderCount: 4 },
      { storefrontId: B, orderCount: 0 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 80 },
      { storefrontId: B, amount: 0 },
    ]);
  });

  it('returns all-zero when there are no orders', () => {
    const rows = allocateLaborByOrderCount(120, [
      { storefrontId: A, orderCount: 0 },
      { storefrontId: B, orderCount: 0 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 0 },
      { storefrontId: B, amount: 0 },
    ]);
    expect(sum(rows)).toBe(0);
  });

  it('returns all-zero when there is no labour cost', () => {
    const rows = allocateLaborByOrderCount(0, [
      { storefrontId: A, orderCount: 5 },
      { storefrontId: B, orderCount: 5 },
    ]);
    expect(rows.every((r) => r.amount === 0)).toBe(true);
  });

  it('ignores negative order counts as zero weight', () => {
    const rows = allocateLaborByOrderCount(50, [
      { storefrontId: A, orderCount: 5 },
      { storefrontId: B, orderCount: -3 },
    ]);
    expect(rows).toEqual([
      { storefrontId: A, amount: 50 },
      { storefrontId: B, amount: 0 },
    ]);
  });
});
