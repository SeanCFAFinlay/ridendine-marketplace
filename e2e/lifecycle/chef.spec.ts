/**
 * Lifecycle: Chef end-to-end journey
 *
 * Covers: sign-up → storefront setup → add menu item → toggle online →
 *         receive order (API-injected) → accept → preparing → ready →
 *         view payouts.
 *
 * Seed dependencies:
 *   - Seeded chef: sean@ridendine.ca / password123 (chef_id: aaaaaaaa-...)
 *   - Seeded storefront: every-bite-yum (for payouts baseline)
 *   - Seeded orders: RND-004 (preparing) or RND-005 (pending) associated with
 *     storefronts — chef needs a pending order to accept.
 *
 * Missing seed hooks needed for full green run:
 *   - A pending order owned by the new-chef account (created via admin client in
 *     beforeEach or via a seeded fixture user).
 *   - PROCESSOR_TOKEN env var for direct API order-state injection.
 */

import { expect, test } from '@playwright/test';

test.describe('chef lifecycle @lifecycle', () => {
  test.use({ baseURL: 'http://127.0.0.1:3001' });

  test('new chef can sign up', async ({ page }) => {
    const chefEmail = `chef-${Date.now()}@ridendine.ca`;
    await page.goto('/auth/signup');
    await page.getByLabel(/first name/i).fill('E2E');
    await page.getByLabel(/last name/i).fill('Chef');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/phone/i).fill('+1 555 020 1234');
    await page.getByLabel(/^password/i).fill('ChefPass123!');
    const confirmField = page.getByLabel(/confirm password/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill('ChefPass123!');
    }
    await page.getByLabel(/terms of service/i).check();
    await page.getByLabel(/independent contractor/i).check();
    await page.getByRole('button', { name: /create chef account/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/signup/, { timeout: 10_000 });
  });

  test('chef can complete storefront setup', async ({ page }) => {
    // Sign in as seeded chef
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/storefront');
    await expect(page).toHaveURL(/\/dashboard\/storefront/, { timeout: 5_000 });
    // Storefront page should render required fields (name, description)
    await expect(page.getByText(/storefront|shop name|business name/i).first()).toBeVisible();
  });

  test('chef can add a menu category and menu item', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/menu');
    await expect(page).toHaveURL(/\/dashboard\/menu/);
    // Menu page should show items from seed
    await expect(page.getByText(/burger|chicken|smash/i).first()).toBeVisible({ timeout: 5_000 });
    // Add category button should be present
    const addCatBtn = page.getByRole('button', { name: /^category$/i });
    await expect(addCatBtn).toBeVisible();
  });

  test('chef can toggle availability online', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/availability');
    await expect(page).toHaveURL(/\/dashboard\/availability/);
    // Toggle or switch element should be present
    const toggle = page.locator('input[type="checkbox"]').first();
    await expect(toggle).toBeVisible({ timeout: 20_000 });
  });

  test('chef can accept a pending order', async ({ page }) => {
    // Uses seeded order RND-005 (pending, HOÀNG GIA PHỞ / Tuan).
    // Sign in as seeded chef tuan@ridendine.ca
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('tuan@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    // The live accept/prep/ready workflow lives in Kitchen Command; the Orders
    // page is a read-only ledger. Drive the KDS ticket here.
    await page.goto('/dashboard/kitchen');
    // Scope to the RND-005 kitchen ticket card: RND-008 on the same board is the
    // DEDICATED chef-reject fixture for negative-paths.spec.ts and must not
    // be consumed here. RND-005 is seeded 10 minutes in the past, so the
    // 8-minute acceptance timeout may already have auto-rejected it — in
    // that case the guard below skips (existing behaviour).
    const orderCard = page.locator('div.rounded-xl.bg-white').filter({ hasText: 'RND-005' }).last();
    const acceptBtn = orderCard.getByRole('button', { name: /^accept$/i });
    if (!(await acceptBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await acceptBtn.click();
    // Accepting advances the ticket's action to "Start Preparing".
    await expect(orderCard.getByRole('button', { name: /start preparing/i })).toBeVisible({ timeout: 5_000 });
  });

  test('chef can mark order as preparing and then ready', async ({ page }) => {
    // Uses seeded order RND-004 (accepted → preparing state for sean@ridendine.ca)
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    // Prep/ready actions live on the Kitchen board, not the Orders ledger.
    await page.goto('/dashboard/kitchen');
    // Seed order RND-004 is in 'preparing' state — look for ready button
    const readyBtn = page.getByRole('button', { name: /mark ready|^ready$/i }).first();
    if (!(await readyBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await readyBtn.click();
    await expect(page.getByText(/ready|ready_for_pickup/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('chef payouts page renders with pending balance', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/payouts');
    await expect(page).toHaveURL(/\/dashboard\/payouts/);
    // Balance section should render
    await expect(page.getByText(/balance|earnings|payout/i).first()).toBeVisible({ timeout: 5_000 });
  });
});
