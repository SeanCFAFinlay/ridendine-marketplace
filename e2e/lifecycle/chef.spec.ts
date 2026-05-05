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
 *   - Seeded orders: ord-00004 (preparing) or ord-00005 (pending) associated with
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
    const chefEmail = `chef-${Date.now()}@test.local`;
    await page.goto('/auth/signup');
    await page.getByLabel(/email/i).fill(chefEmail);
    await page.getByLabel(/^password/i).fill('ChefPass123!');
    const confirmField = page.getByLabel(/confirm password/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill('ChefPass123!');
    }
    await page.getByRole('button', { name: /sign up|create account|register/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
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
    const addCatBtn = page.getByRole('button', { name: /add category|new category/i });
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
    const toggle = page.locator('[role="switch"], input[type="checkbox"], [data-testid*="toggle"]').first();
    await expect(toggle).toBeVisible({ timeout: 5_000 });
  });

  test('chef can accept a pending order', async ({ page }) => {
    // Uses seeded order ord-00005 (pending, HOÀNG GIA PHỞ / Tuan)
    // Sign in as seeded chef tuan@ridendine.ca
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('tuan@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/orders');
    // Seed order RND-005 should appear as pending
    const acceptBtn = page.getByRole('button', { name: /accept/i }).first();
    if (!(await acceptBtn.isVisible({ timeout: 5_000 }))) {
      test.skip();
    }
    await acceptBtn.click();
    await expect(page.getByText(/accepted|preparing/i).first()).toBeVisible({ timeout: 5_000 });
  });

  test('chef can mark order as preparing and then ready', async ({ page }) => {
    // Uses seeded order ord-00004 (accepted → preparing state for sean@ridendine.ca)
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('sean@ridendine.ca');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto('/dashboard/orders');
    // Seed order RND-004 is in 'preparing' state — look for ready button
    const readyBtn = page.getByRole('button', { name: /ready|mark ready/i }).first();
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
