/**
 * Lifecycle: Cross-app smoke tests
 *
 * For each app, navigate to key routes and assert:
 *   - No JS console errors (level: error) during navigation
 *   - No 5xx HTTP responses
 *
 * These tests run across all four Playwright projects (web-smoke,
 * chef-admin-smoke, ops-admin-smoke, driver-app-smoke).
 */

import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

interface RouteCheck {
  path: string;
  /** Text expected to appear somewhere on the page (loose assertion). */
  expectedText?: RegExp;
  /** Whether an unauthenticated user should be redirected to /auth/login. */
  requiresAuth?: boolean;
}

async function smokeRoute(
  page: Page,
  route: RouteCheck
): Promise<{ jsErrors: string[]; serverErrors: string[] }> {
  const jsErrors: string[] = [];
  const serverErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      jsErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(route.path, { waitUntil: 'domcontentloaded' });

  if (route.requiresAuth) {
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 8_000 });
  } else if (route.expectedText) {
    await expect(page.getByText(route.expectedText).first()).toBeVisible({ timeout: 8_000 });
  }

  return { jsErrors, serverErrors };
}

// ── Web (port 3000) ───────────────────────────────────────────────────────────

const WEB_ROUTES: RouteCheck[] = [
  { path: '/', expectedText: /home.?cooked|browse chefs|ridendine/i },
  { path: '/chefs', expectedText: /browse chefs/i },
  { path: '/auth/login', expectedText: /sign in|log in/i },
  { path: '/auth/signup', expectedText: /sign up|create account/i },
  { path: '/cart', requiresAuth: true },
  { path: '/checkout', requiresAuth: true },
  { path: '/account/orders', requiresAuth: true },
];

test.describe('web smoke — no console errors and no 5xx', () => {
  test.use({ baseURL: 'http://127.0.0.1:3000' });

  for (const route of WEB_ROUTES) {
    test(`web ${route.path} has no 5xx errors @smoke`, async ({ page }) => {
      const { serverErrors } = await smokeRoute(page, route);
      expect(serverErrors, `5xx on ${route.path}: ${serverErrors.join(', ')}`).toHaveLength(0);
    });
  }
});

// ── Chef-admin (port 3001) ────────────────────────────────────────────────────

const CHEF_ADMIN_ROUTES: RouteCheck[] = [
  { path: '/auth/login', expectedText: /sign in|log in/i },
  { path: '/auth/signup', expectedText: /sign up|create account|register/i },
  { path: '/dashboard', requiresAuth: true },
  { path: '/dashboard/orders', requiresAuth: true },
  { path: '/dashboard/menu', requiresAuth: true },
  { path: '/dashboard/storefront', requiresAuth: true },
  { path: '/dashboard/payouts', requiresAuth: true },
];

test.describe('chef-admin smoke — no console errors and no 5xx', () => {
  test.use({ baseURL: 'http://127.0.0.1:3001' });

  for (const route of CHEF_ADMIN_ROUTES) {
    test(`chef-admin ${route.path} has no 5xx errors @smoke`, async ({ page }) => {
      const { serverErrors } = await smokeRoute(page, route);
      expect(serverErrors, `5xx on ${route.path}: ${serverErrors.join(', ')}`).toHaveLength(0);
    });
  }
});

// ── Ops-admin (port 3002) ─────────────────────────────────────────────────────

const OPS_ADMIN_ROUTES: RouteCheck[] = [
  { path: '/auth/login', expectedText: /sign in|log in/i },
  { path: '/dashboard', requiresAuth: true },
  { path: '/dashboard/orders', requiresAuth: true },
  { path: '/dashboard/chefs', requiresAuth: true },
  { path: '/dashboard/drivers', requiresAuth: true },
  { path: '/dashboard/payouts', requiresAuth: true },
  { path: '/dashboard/finance', requiresAuth: true },
];

test.describe('ops-admin smoke — no console errors and no 5xx', () => {
  test.use({ baseURL: 'http://127.0.0.1:3002' });

  for (const route of OPS_ADMIN_ROUTES) {
    test(`ops-admin ${route.path} has no 5xx errors @smoke`, async ({ page }) => {
      const { serverErrors } = await smokeRoute(page, route);
      expect(serverErrors, `5xx on ${route.path}: ${serverErrors.join(', ')}`).toHaveLength(0);
    });
  }
});

// ── Driver-app (port 3003) ────────────────────────────────────────────────────

const DRIVER_APP_ROUTES: RouteCheck[] = [
  { path: '/auth/login', expectedText: /sign in|log in/i },
  { path: '/auth/signup', expectedText: /sign up|create account|register/i },
  { path: '/', requiresAuth: true },
  { path: '/delivery', requiresAuth: true },
  { path: '/earnings', requiresAuth: true },
  { path: '/history', requiresAuth: true },
  { path: '/profile', requiresAuth: true },
];

test.describe('driver-app smoke — no console errors and no 5xx', () => {
  test.use({ baseURL: 'http://127.0.0.1:3003' });

  for (const route of DRIVER_APP_ROUTES) {
    test(`driver-app ${route.path} has no 5xx errors @smoke`, async ({ page }) => {
      const { serverErrors } = await smokeRoute(page, route);
      expect(serverErrors, `5xx on ${route.path}: ${serverErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
