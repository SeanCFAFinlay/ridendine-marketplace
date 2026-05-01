import { expect, test } from '@playwright/test';

test.describe('platform auth smoke', () => {
  test('chef-admin boot + protected route guard @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chef-admin-smoke', 'chef-admin-only test');
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('ops-admin boot + protected route guard @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'ops-admin-smoke', 'ops-admin-only test');
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.goto('/dashboard/orders');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('driver-app boot + protected route guard @smoke', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'driver-app-smoke', 'driver-app-only test');
    await page.goto('/auth/login');
    await expect(page).toHaveURL(/\/auth\/login/);
    await page.goto('/delivery/123');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
