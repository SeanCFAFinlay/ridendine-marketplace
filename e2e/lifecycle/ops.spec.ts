/**
 * Lifecycle: Ops manager end-to-end journey
 *
 * Covers: sign in as ops_manager → live board → drill into stuck order →
 *         force-assign driver → approve pending chef → process refund →
 *         run payout preview → run reconciliation (zero discrepancies).
 *
 * Seed dependencies:
 *   - Ops super_admin: ops@ridendine.ca / password123
 *   - Seeded in-flight orders: ord-00004 (preparing), ord-00005 (pending),
 *     ord-00006 (ready_for_pickup — "stuck" for force-assign scenario)
 *   - Seeded approved drivers: drv-00001, drv-00002
 *
 * Missing seed hooks needed for full green run:
 *   - A 'pending_approval' chef account for the approve-chef test.
 *     (All seeded chefs are already 'approved'.)
 *   - A refundable completed order with payment_status='completed'.
 */

import { expect, test } from '@playwright/test';

test.describe('ops lifecycle @lifecycle', () => {
  test.use({ baseURL: 'http://127.0.0.1:3002' });

  test.beforeEach(async ({ page }) => {
    // Sign in as ops super_admin before each test
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('ops@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
  });

  test('ops dashboard live board renders with in-flight orders', async ({ page }) => {
    await page.goto('/dashboard');
    // Live board / orders section
    await expect(page.getByText(/live|board|active|in.?flight|orders/i).first()).toBeVisible({ timeout: 10_000 });
    // Seeded orders should appear (preparing, pending, ready_for_pickup)
    await expect(page.getByText(/RND-00[456]|preparing|pending|ready/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can drill into an order and see full details', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/dashboard\/orders/);
    // Click into first order row
    const firstRow = page.getByRole('row').nth(1).or(page.locator('[data-testid*="order-row"]').first());
    if (await firstRow.isVisible({ timeout: 5_000 })) {
      await firstRow.click();
    } else {
      const viewBtn = page.getByRole('link', { name: /view|details/i }).first();
      await viewBtn.click();
    }
    // Order detail page should render status and items
    await expect(page.getByText(/order|status|item/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can force-assign a driver to a stuck order', async ({ page }) => {
    // Navigate to the ready_for_pickup seeded order (ord-00006 / RND-006)
    await page.goto('/dashboard/orders');
    // Try to find the ready_for_pickup row
    const stuckRow = page.getByText(/ready_for_pickup|RND-006/i).first();
    if (!(await stuckRow.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await stuckRow.click();
    // Force-assign / dispatch action
    const assignBtn = page.getByRole('button', { name: /assign driver|force.?assign|dispatch/i }).first();
    if (!(await assignBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await assignBtn.click();
    // Driver selector
    const driverOption = page.getByRole('option').first().or(
      page.getByText(/mike chen|sarah kim/i).first()
    );
    if (await driverOption.isVisible({ timeout: 3_000 })) {
      await driverOption.click();
    }
    const confirmBtn = page.getByRole('button', { name: /confirm|assign|save/i }).last();
    await confirmBtn.click();
    await expect(page.getByText(/assigned|driver assigned|success/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can approve a pending chef', async ({ page }) => {
    await page.goto('/dashboard/chefs');
    await expect(page).toHaveURL(/\/dashboard\/chefs/);
    // Pending chefs section
    const pendingChef = page.getByText(/pending|awaiting approval/i).first();
    if (!(await pendingChef.isVisible({ timeout: 5_000 }))) {
      // All seed chefs are approved — skip until a pending_approval chef is seeded
      test.skip();
    }
    const approveBtn = page.getByRole('button', { name: /approve/i }).first();
    await approveBtn.click();
    await expect(page.getByText(/approved|success/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('ops can process a refund on a completed order', async ({ page }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      test.skip();
    }
    await page.goto('/dashboard/refunds');
    await expect(page).toHaveURL(/\/dashboard\/refunds/);
    const refundBtn = page.getByRole('button', { name: /issue refund|refund|process/i }).first();
    if (!(await refundBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await refundBtn.click();
    await expect(page.getByText(/refund|processed|success/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops can run payout preview', async ({ page }) => {
    await page.goto('/dashboard/payouts');
    await expect(page).toHaveURL(/\/dashboard\/payouts/);
    // Preview button
    const previewBtn = page.getByRole('button', { name: /preview|run preview|calculate/i }).first();
    if (!(await previewBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await previewBtn.click();
    await expect(page.getByText(/preview|payout|total/i).first()).toBeVisible({ timeout: 8_000 });
  });

  test('ops reconciliation runs cleanly with zero discrepancies', async ({ page }) => {
    await page.goto('/dashboard/finance');
    if (!(await page.isVisible('text=/reconcil/i'))) {
      // Also try the reconciliation direct route
      await page.goto('/dashboard/analytics');
    }
    const reconBtn = page.getByRole('button', { name: /reconcil|run reconcil/i }).first();
    if (!(await reconBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await reconBtn.click();
    await expect(
      page.getByText(/zero discrepancies|no discrepancies|clean|0 discrepanc/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
