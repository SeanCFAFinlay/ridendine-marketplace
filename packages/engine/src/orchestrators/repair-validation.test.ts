/**
 * Repair Validation Tests
 * Tests for all fixes applied in the 2026-04-28 repair sprint.
 * Covers: FND-004, FND-017, FND-018, FND-019, FND-013
 *
 * Updated (Stage 3): references point to canonical engine files.
 * - dispatch.engine.ts → delivery-engine.ts (FND-004)
 * - order.orchestrator.ts → master-order-engine.ts (FND-017) and order-creation.service.ts (FND-018)
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SERVICE_REGION_CENTER,
  DEFAULT_MAP_ZOOM,
  PLATFORM_FEE_PERCENT,
  SERVICE_FEE_PERCENT,
  HST_RATE,
  BASE_DELIVERY_FEE,
  DRIVER_PAYOUT_PERCENT,
} from '../constants';

// ==========================================
// FND-004: delivery_events column name
// ==========================================
describe('FND-004: delivery_events uses event_data column', () => {
  it('delivery engine source uses event_data not data for delivery_events insert', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const deliverySource = fs.readFileSync(
      path.resolve(__dirname, './delivery-engine.ts'),
      'utf-8'
    );

    // Find the delivery_events insert block
    const insertMatch = deliverySource.match(
      /from\('delivery_events'\)\.insert\(\{[\s\S]*?\}\)/
    );
    expect(insertMatch).toBeTruthy();
    const insertBlock = insertMatch![0];

    // Must use event_data, not data
    expect(insertBlock).toContain('event_data:');
    expect(insertBlock).not.toMatch(/\bdata:/);

    // Must include actor_type
    expect(insertBlock).toContain('actor_type:');
  });
});

// ==========================================
// FND-017: PaymentAdapter interface
// ==========================================
describe('FND-017: PaymentAdapter exists and is used', () => {
  it('MasterOrderEngine factory accepts PaymentAdapter', async () => {
    const mod = await import('./master-order-engine');
    expect(typeof mod.createMasterOrderEngine).toBe('function');
    expect(mod.createMasterOrderEngine.length).toBeGreaterThanOrEqual(3);
  });

  it('rejectOrder void logic references paymentAdapter in master-order-engine source', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, './master-order-engine.ts'),
      'utf-8'
    );

    // rejectOrder alias should reference paymentAdapter or voidPaymentIntent
    const rejectSection = source.slice(
      source.indexOf('async rejectOrder('),
      source.indexOf('async startPreparing(')
    );
    expect(rejectSection).toContain('voidPaymentIntent');

    // cancelOrder should also reference paymentAdapter
    const cancelSection = source.slice(
      source.indexOf('async cancelOrder('),
      source.indexOf('async refundOrder(')
    );
    expect(cancelSection).toContain('voidPaymentIntent');
  });

  it('ledger entries distinguish void completed vs pending', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, './master-order-engine.ts'),
      'utf-8'
    );

    // Should have both entry types
    expect(source).toContain("'customer_charge_void'");
    expect(source).toContain("'customer_charge_void_pending'");
  });
});

// ==========================================
// FND-018: null user_id guard
// ==========================================
describe('FND-018: submitToKitchen guards null chefUserId', () => {
  it('notification insert is guarded by if (chefUserId)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, './order-creation.service.ts'),
      'utf-8'
    );

    // Find the submitToKitchen method (last method in the file)
    const submitStart = source.indexOf('async submitToKitchen(');
    const submitSection = source.slice(submitStart);

    // Must have the guard
    expect(submitSection).toContain('if (chefUserId)');

    // Must have the else branch with exception
    expect(submitSection).toContain('chef_notification_failed');
    expect(submitSection).toContain('chef_notification_skipped');
  });
});

// ==========================================
// FND-013: Shared geo constants
// ==========================================
describe('FND-013: Hamilton coordinates extracted to constants', () => {
  it('DEFAULT_SERVICE_REGION_CENTER is Hamilton, ON', () => {
    expect(DEFAULT_SERVICE_REGION_CENTER).toEqual([43.2557, -79.8711]);
  });

  it('DEFAULT_MAP_ZOOM is 12', () => {
    expect(DEFAULT_MAP_ZOOM).toBe(12);
  });

  it('map files no longer contain hardcoded coordinates', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const root = path.resolve(__dirname, '../../../../');

    const mapFiles = [
      'apps/web/src/components/tracking/order-tracking-map.tsx',
      'apps/driver-app/src/components/map/route-map.tsx',
      'apps/ops-admin/src/components/map/delivery-map.tsx',
      'apps/ops-admin/src/components/map/live-map.tsx',
    ];

    for (const file of mapFiles) {
      const fullPath = path.resolve(root, file);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf-8');
      // Should not contain inline Hamilton coordinates (except in imports/comments)
      const lines = content.split('\n').filter(
        (line) => !line.includes('import') && !line.includes('//')
      );
      const codeOnly = lines.join('\n');
      expect(codeOnly).not.toMatch(/\[43\.2557,\s*-79\.8711\]/);
    }
  });
});

// ==========================================
// FND-019: BYPASS_AUTH production guard
// ==========================================
describe('FND-019: BYPASS_AUTH production guard', () => {
  it('middleware source contains production crash guard', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../../auth/src/middleware.ts'),
      'utf-8'
    );

    expect(source).toContain("process.env.NODE_ENV === 'production'");
    expect(source).toContain('BYPASS_AUTH=true is not allowed in production');
  });
});

// ==========================================
// Platform constants sanity
// ==========================================
describe('Platform constants are valid', () => {
  it('fee percentages are within reasonable bounds', () => {
    expect(PLATFORM_FEE_PERCENT).toBeGreaterThan(0);
    expect(PLATFORM_FEE_PERCENT).toBeLessThan(100);
    expect(SERVICE_FEE_PERCENT).toBeGreaterThan(0);
    expect(SERVICE_FEE_PERCENT).toBeLessThan(100);
    expect(HST_RATE).toBeGreaterThan(0);
    expect(HST_RATE).toBeLessThan(100);
  });

  it('delivery fee is in cents', () => {
    expect(BASE_DELIVERY_FEE).toBeGreaterThan(99); // At least $1
    expect(BASE_DELIVERY_FEE).toBeLessThan(5000); // Less than $50
  });

  it('driver payout is a percentage', () => {
    expect(DRIVER_PAYOUT_PERCENT).toBeGreaterThan(0);
    expect(DRIVER_PAYOUT_PERCENT).toBeLessThanOrEqual(100);
  });
});
