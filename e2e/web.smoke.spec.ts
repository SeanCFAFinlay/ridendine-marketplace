import { expect, test } from '@playwright/test';
import { deterministicFixtures } from './fixtures/test-data';

test.describe('web smoke', () => {
  test('marketplace home loads @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'web-smoke', 'web-only test');
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Browse Chefs' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Home-Cooked Meals/i })).toBeVisible();
  });

  test('chefs browse page loads @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'web-smoke', 'web-only test');
    await page.goto('/chefs');
    await expect(page.getByRole('heading', { name: 'Browse Chefs' })).toBeVisible();
  });

  test('protected checkout route redirects unauthenticated users @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'web-smoke', 'web-only test');
    await page.goto(`/checkout?storefrontId=${deterministicFixtures.cart.storefrontId}`);
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
