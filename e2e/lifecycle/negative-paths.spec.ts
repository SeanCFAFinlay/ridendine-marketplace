/**
 * Lifecycle: Negative-path coverage across all four apps
 *
 * Covers the "unhappy" branches of the order lifecycle:
 *   - Customer: cancel a still-pending order, checkout with an empty cart,
 *     invalid promo code feedback.
 *   - Chef: reject a pending order (with a reason), terminal-state order
 *     actions are refused gracefully by the API.
 *   - Ops: refund queue up to the approval confirmation point (Stripe-gated
 *     beyond that), suspending a chef via the required window.prompt reason
 *     dialog and verifying the storefront disappears from the marketplace.
 *   - Driver: declining a delivery offer releases it back to the dispatch pool.
 *
 * Seed dependencies (from supabase/seeds/seed.sql):
 *   - Customer logins: alice@example.com / bob@example.com (password123)
 *   - Chef logins: tuan@ridendine.ca (HOÀNG GIA PHỞ), sean@ridendine.ca (Every Bite Yum)
 *   - Ops super_admin: ops@ridendine.ca / password123
 *   - Driver: mike.driver@ridendine.ca / password123 (approved)
 *   - Pending order RND-007 (0d000000-0000-4000-8000-000000000007) — DEDICATED
 *     customer-cancel fixture (Alice, Every Bite Yum, created_at NOW())
 *   - Pending order RND-008 (0d000000-0000-4000-8000-000000000008) — DEDICATED
 *     chef-reject fixture (Bob, HOÀNG GIA PHỞ / Tuan, created_at NOW())
 *   - Pending driver offer 0ffe0000-… (assignment_attempts, response 'pending',
 *     expires NOW()+4h) on the unassigned delivery b2b2b2b2-… offered to Mike
 *   - Pending refund case ca5e0000-… (refund_cases, status 'pending') against
 *     delivered order RND-001
 *   - Delivered order RND-001 (0d000000-0000-4000-8000-000000000001) — Every Bite Yum (terminal status)
 *   - Approved chef Ryo (cccccccc-…) with active storefront COOCO (ffffffff-…)
 *   - Storefront every-bite-yum (dddddddd-…) with menu items
 *
 * Remaining runtime guards (graceful skips for stale local DBs only — a fresh
 * `supabase db reset` makes every test below run):
 *   - RND-007 / RND-008 are dedicated to this spec (RND-005 stays the
 *     chef.spec.ts accept fixture), so there is no cross-test contention; the
 *     skips only fire when a previous partial run already consumed a fixture.
 *   - The driver decline test prefers the seeded offer and skips only when no
 *     live pending offer exists for the seeded driver.
 *   - The refund approval test stays Stripe-gated (STRIPE_SECRET_KEY).
 */

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// ── Seed fixture IDs (supabase/seeds/seed.sql) ────────────────────────────────

const SEED_STOREFRONT_SLUG = 'every-bite-yum';
const SEED_STOREFRONT_EBY_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const SEED_CANCELLABLE_ORDER_ID = '0d000000-0000-4000-8000-000000000007'; // RND-007, pending, Alice, EBY
const SEED_REJECTABLE_ORDER_NUMBER = 'RND-008'; // 0d000000-…-008, pending, HOÀNG GIA PHỞ (Tuan)
const SEED_DELIVERED_ORDER_ID = '0d000000-0000-4000-8000-000000000001'; // RND-001, delivered, EBY
const SEED_REFUNDED_ORDER_NUMBER = 'RND-001'; // order behind the seeded refund case
const SEED_UNASSIGNED_DELIVERY_ID = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';
const SEED_DRIVER_OFFER_ATTEMPT_ID = '0ffe0000-0000-4000-8000-000000000001'; // pending offer for Mike
const SEED_CHEF_RYO_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const SEED_STOREFRONT_COOCO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
const SEED_STOREFRONT_COOCO_SLUG = 'cooco';

const WEB_BASE = 'http://127.0.0.1:3000';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Reliable visibility probe — Locator.isVisible() does not wait. */
async function becomesVisible(locator: import('@playwright/test').Locator, timeout = 8_000) {
  return locator
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

async function signInWebCustomer(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 15_000 });
}

async function signInChefAdmin(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });
}

async function signInOps(page: Page) {
  await page.goto('/auth/login');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ops@ridendine.ca',
        password: 'password123',
      }),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text(),
    };
  });

  expect(result.ok, `ops login failed (${result.status}): ${result.body}`).toBe(true);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

async function signInDriver(page: Page) {
  await page.goto('/auth/login');
  const result = await page.evaluate(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email: 'mike.driver@ridendine.ca',
        password: 'password123',
      }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      error: typeof body.error === 'string' ? body.error : null,
    };
  });

  expect(result, result.error ?? `Driver login failed with status ${result.status}`).toMatchObject({
    ok: true,
  });
  await page.goto('/');
  await expect(page).not.toHaveURL(/\/auth\/login/);
}

async function waitForCartCount(page: Page) {
  await expect(page.getByText(/your cart is empty/i)).toBeHidden({ timeout: 30_000 });
  await expect(page.locator('a[href="/cart"]').filter({ hasText: /\d+/ }).first()).toBeVisible({
    timeout: 30_000,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Customer negative paths (web, port 3000)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('customer negative paths @lifecycle @negative', () => {
  test.use({ baseURL: 'http://127.0.0.1:3000' });

  test('customer can cancel a pending order from the tracking page', async ({ page }) => {
    // Uses seed order RND-007 (pending, owned by Alice) — a DEDICATED fixture
    // for this test, so no other lifecycle scenario contends for it. The
    // customer cancel API only allows engine_status
    // pending/payment_authorized/checkout_pending, which matches the seeded
    // engine_status of 'pending'.
    await signInWebCustomer(page, 'alice@example.com');
    await page.goto(`/orders/${SEED_CANCELLABLE_ORDER_ID}/confirmation`);

    const cancelBtn = page.getByRole('button', { name: /cancel order/i });
    if (!(await becomesVisible(cancelBtn, 10_000))) {
      // RND-007 is dedicated to this test; the only way it is not cancellable
      // is a stale local DB where a previous run already cancelled it (or the
      // 8-minute acceptance timeout elapsed since the seed was applied).
      test.skip(true, 'Seed order RND-007 is no longer pending at runtime (stale local DB — run supabase db reset)');
    }
    await cancelBtn.click();

    // Inline confirmation step — confirm the cancellation.
    const confirmBtn = page.getByRole('button', { name: /yes,?\s*cancel/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // Success message from POST /api/orders/[id]/cancel
    await expect(
      page.getByText(/order has been cancelled/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('checkout with an empty cart shows a graceful empty state, not a crash', async ({ page }) => {
    const serverErrors: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 500) {
        serverErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    // 1. The cart page itself prevents checkout when empty: no Proceed button.
    await page.goto('/cart');
    await expect(page.getByText(/your cart is empty/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /proceed to checkout/i })).toBeHidden();

    // 2. Hitting /checkout directly with a guaranteed-empty cart (fresh account,
    //    so no other parallel lifecycle test can have populated it) must render
    //    the graceful empty-cart card — never a server error page.
    const email = `neg-empty-cart-${Date.now()}@test.local`;
    await page.goto('/auth/signup');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill('TestPass123!');
    const confirmField = page.getByLabel(/confirm password/i);
    if (await confirmField.isVisible()) {
      await confirmField.fill('TestPass123!');
    }
    await page.getByRole('button', { name: /sign up|create account|register/i }).click();
    await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 10_000 });

    await page.goto(`/checkout?storefrontId=${SEED_STOREFRONT_EBY_ID}`);
    // Graceful outcomes: the empty-cart card, or (if the fresh account has no
    // customer profile yet) a clean redirect to login. Anything else fails below.
    await expect(
      page
        .getByText(/your cart is empty|add items to your cart/i)
        .or(page.getByLabel(/email/i))
        .first()
    ).toBeVisible({ timeout: 20_000 });

    expect(serverErrors, `5xx during empty-cart checkout: ${serverErrors.join(', ')}`).toHaveLength(0);
  });

  test('an invalid promo code shows the invalid state at checkout', async ({ page }) => {
    // Bob is not used by other lifecycle specs, so his cart state is ours.
    await signInWebCustomer(page, 'bob@example.com');

    await page.goto(`/chefs/${SEED_STOREFRONT_SLUG}`);
    const addBtn = page.getByRole('button', { name: /^add$/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();
    await waitForCartCount(page);

    await page.getByRole('link', { name: /view cart/i }).first().click();
    await page.getByRole('link', { name: /proceed to checkout/i }).first().click();
    await expect(page).toHaveURL(/\/checkout\?storefrontId=/);

    const promoInput = page.getByPlaceholder(/enter promo code/i);
    await expect(promoInput).toBeVisible({ timeout: 20_000 });
    await promoInput.fill('E2E-BOGUS-PROMO-CODE');

    // Debounced GET /api/promos/validate returns
    // { success: false, error: 'Promo code not found' } for unknown codes.
    await expect(
      page.getByText(/promo code not found|invalid promo|could not validate/i).first()
    ).toBeVisible({ timeout: 15_000 });
    // The "✓ … applied" success hint must never appear for a bogus code.
    await expect(page.getByText(/✓ .*applied/i)).toBeHidden();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Chef negative paths (chef-admin, port 3001)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('chef negative paths @lifecycle @negative', () => {
  test.use({ baseURL: 'http://127.0.0.1:3001' });

  test('chef can reject a pending order with a reason', async ({ page }) => {
    // Uses seed order RND-008 (pending, HOÀNG GIA PHỞ / Tuan) — a DEDICATED
    // fixture for this test (chef.spec.ts accept targets RND-005). The kitchen
    // UI's Reject action posts { action: 'reject', reason: 'other', notes:
    // 'Rejected by chef' } — the engine refuses rejects without a reason
    // (MISSING_REASON).
    await signInChefAdmin(page, 'tuan@ridendine.ca');
    // The Reject action lives on the Kitchen board (the Orders page is now a
    // read-only ledger).
    await page.goto('/dashboard/kitchen');

    // Scope to the RND-008 kitchen ticket card (rounded-xl bg-white); `.last()`
    // picks the innermost match, i.e. the ticket card itself rather than a
    // page-level container.
    const orderCard = page
      .locator('div.rounded-xl.bg-white')
      .filter({ hasText: SEED_REJECTABLE_ORDER_NUMBER })
      .last();
    const rejectBtn = orderCard.getByRole('button', { name: /^reject$/i });
    if (!(await becomesVisible(rejectBtn, 8_000))) {
      // RND-008 is dedicated to this test; it can only be missing on a stale
      // local DB where a previous run already rejected it (or the 8-minute
      // acceptance timeout elapsed since the seed was applied).
      test.skip(true, 'Seed order RND-008 is no longer pending at runtime (stale local DB — run supabase db reset)');
    }
    await rejectBtn.click();

    // A rejected ticket leaves the active KDS board (no column tracks the
    // 'rejected' state), so the card disappears once the engine confirms.
    await expect(orderCard).toBeHidden({ timeout: 10_000 });
  });

  test('order action on a terminal-state order is refused gracefully by the API', async ({ page }) => {
    // RND-001 is delivered (terminal). We attempt 'start_preparing', which has
    // no valid path from the order's current engine state, so the engine must
    // refuse with a clean 4xx — never a 500.
    //
    // Note: 'accept' is deliberately NOT used here. The seed leaves
    // orders.engine_status at its column default ('pending') for historical
    // orders, so an accept would slip through the engine state machine and
    // corrupt the delivered fixture used by other lifecycle tests.
    await signInChefAdmin(page, 'sean@ridendine.ca');

    const patchResult = await page.evaluate(async (orderId) => {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_preparing' }),
      });
      const body = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, body };
    }, SEED_DELIVERED_ORDER_ID);

    expect(patchResult.ok, 'terminal-state action must be refused').toBe(false);
    expect(patchResult.status).toBeGreaterThanOrEqual(400);
    expect(patchResult.status, 'refusal must be graceful (4xx), not a server crash').toBeLessThan(500);
    expect(patchResult.body?.success).toBe(false);
    expect(String(patchResult.body?.error?.message ?? patchResult.body?.error ?? '')).toMatch(
      /transition|invalid/i
    );

    // The order must be untouched.
    const after = await page.evaluate(async (orderId) => {
      const response = await fetch(`/api/orders/${orderId}`);
      const body = await response.json().catch(() => null);
      return { ok: response.ok, status: body?.data?.order?.status ?? null };
    }, SEED_DELIVERED_ORDER_ID);
    expect(after.ok).toBe(true);
    expect(after.status).toBe('delivered');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Ops negative paths (ops-admin, port 3002)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('ops negative paths @lifecycle @negative', () => {
  test.use({ baseURL: 'http://127.0.0.1:3002' });

  test.beforeEach(async ({ page }) => {
    await signInOps(page);
  });

  test('refund queue renders the flow up to the approval confirmation point', async ({ page }) => {
    // The actual Stripe refund only happens after Approve is clicked — this
    // test deliberately stops at the confirmation point so it can run without
    // STRIPE_SECRET_KEY. seed.sql ships a pending refund case (ca5e0000-…,
    // $18.99 quality_issue against delivered order RND-001), so the queue
    // must render populated with the case row and its Approve/Deny actions.
    await page.goto('/dashboard/finance/refunds');
    await expect(page.getByText(/refund queue/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/pending refund exposure/i).first()).toBeVisible();

    const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
    if (!(await becomesVisible(approveBtn, 10_000))) {
      // The seeded case is dedicated to this suite; it is only absent on a
      // stale local DB where an earlier Stripe-gated run approved/denied it.
      test.skip(true, 'Seeded refund case ca5e0000-… is no longer pending at runtime (stale local DB — run supabase db reset)');
    }
    // Confirmation point reached: the seeded case row exposes Approve/Deny.
    await expect(page.getByText(SEED_REFUNDED_ORDER_NUMBER).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^deny$/i }).first()).toBeVisible();
  });

  test('ops can approve a pending refund case (Stripe-gated)', async ({ page }) => {
    if (!process.env.STRIPE_SECRET_KEY) {
      // Approving triggers a real Stripe refund — keep this gate.
      test.skip();
    }
    await page.goto('/dashboard/finance/refunds');
    await expect(page.getByText(/refund queue/i).first()).toBeVisible({ timeout: 15_000 });

    const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
    if (!(await becomesVisible(approveBtn, 5_000))) {
      // seed.sql ships a pending case (ca5e0000-…); it is only absent when a
      // previous Stripe-gated run on a stale local DB already reviewed it.
      test.skip(true, 'Seeded refund case ca5e0000-… is no longer pending at runtime (stale local DB — run supabase db reset)');
    }
    await approveBtn.click();
    await expect(page.getByText(/finance action failed/i)).toBeHidden({ timeout: 10_000 });
  });

  test('suspending a chef requires a prompt reason and hides the storefront', async ({ page }) => {
    // Suspension targets Ryo / COOCO — the seeded EBY and PHỞ storefronts stay
    // untouched for the other lifecycle specs. The chefs governance UI raises a
    // window.prompt that REQUIRES a reason (engine: REASON_REQUIRED).
    await page.goto('/dashboard/chefs');
    await expect(page.getByText(/chefs/i).first()).toBeVisible({ timeout: 15_000 });

    const ryoRow = page.locator('tr', { hasText: 'Ryo' }).first();
    const suspendBtn = ryoRow.locator('button[title="Suspend"]');
    if (!(await becomesVisible(suspendBtn, 8_000))) {
      test.skip(true, 'Seed chef Ryo is not in approved state (left suspended by a previous partial run?) — run supabase db reset');
    }

    let suspended = false;
    try {
      // 1. Dismissing the prompt must abort the action — chef stays approved.
      page.once('dialog', (dialog) => {
        expect(dialog.type()).toBe('prompt');
        void dialog.dismiss();
      });
      await suspendBtn.click();
      await expect(ryoRow.getByText(/suspended/i)).toBeHidden();
      await expect(ryoRow.getByText(/approved/i)).toBeVisible();

      // 2. Accepting the prompt with a reason performs the suspension.
      page.once('dialog', (dialog) => {
        void dialog.accept('E2E negative-path test: governance suspension');
      });
      await suspendBtn.click();
      await expect(ryoRow.getByText(/suspended/i)).toBeVisible({ timeout: 15_000 });
      suspended = true;

      // 3. The suspended chef's storefront must vanish from the marketplace:
      //    suspension cascades is_active=false onto chef_storefronts, the
      //    browse query filters on is_active, and the slug route 404s.
      const storefrontResponse = await page.goto(
        `${WEB_BASE}/chefs/${SEED_STOREFRONT_COOCO_SLUG}`
      );
      // notFound() thrown while the page streams can land after the 200
      // status line is already committed (generateMetadata returns normally
      // before the page body throws), so accept either the 404 status or the
      // rendered not-found boundary.
      if (storefrontResponse?.status() !== 404) {
        await expect(
          page.getByText(/not found|doesn't exist|no longer available/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }

      await page.goto(`${WEB_BASE}/chefs`);
      await expect(page.getByRole('heading', { name: /browse chefs/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('link', { name: /cooco/i })).toBeHidden();
    } finally {
      if (suspended) {
        // Best-effort restore so later local runs (without a db reset) and the
        // remaining suite see the seeded marketplace. Unsuspend restores the
        // chef; storefront re-publish is a separate governance action.
        await page.goto('/dashboard/chefs');
        await page.evaluate(
          async ({ chefId, storefrontId }) => {
            await fetch(`/api/chefs/${chefId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'unsuspend',
                reason: 'E2E restore after negative-path suspension test',
              }),
            });
            await fetch(`/api/engine/storefronts/${storefrontId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'publish' }),
            });
          },
          { chefId: SEED_CHEF_RYO_ID, storefrontId: SEED_STOREFRONT_COOCO_ID }
        );
      }
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Driver negative paths (driver-app, port 3003)
// ══════════════════════════════════════════════════════════════════════════════

test.describe('driver negative paths @lifecycle @negative', () => {
  test.use({ baseURL: 'http://127.0.0.1:3003' });

  test('driver can decline a delivery offer and it returns to the dispatch pool', async ({ page }) => {
    await signInDriver(page);

    // Offers live in assignment_attempts (response='pending', unexpired).
    // seed.sql ships a pending offer (0ffe0000-…, attempt 1, expires NOW()+4h)
    // on the unassigned pending delivery (b2b2b2b2-…) offered to the seeded
    // driver Mike, so GET /api/offers returns at least that offer on a fresh
    // DB. Skip only if no live pending offer exists at runtime (stale local
    // DB where a previous run already declined it).
    const offersBefore = await page.evaluate(async () => {
      const response = await fetch('/api/offers');
      const body = await response.json().catch(() => null);
      const offers = body?.data?.offers ?? body?.offers ?? [];
      return { ok: response.ok, status: response.status, offers };
    });

    expect(offersBefore.ok, `GET /api/offers failed with ${offersBefore.status}`).toBe(true);
    if (!Array.isArray(offersBefore.offers) || offersBefore.offers.length === 0) {
      test.skip(true, 'No live pending offer for the seeded driver (seeded offer 0ffe0000-… already consumed — stale local DB, run supabase db reset)');
    }

    // Prefer the seeded fixture offer; fall back to any live offer (e.g. one
    // generated by the dispatch engine during the suite).
    const liveOffers = offersBefore.offers as Array<{ attemptId: string; deliveryId: string }>;
    const offer =
      liveOffers.find((o) => o.attemptId === SEED_DRIVER_OFFER_ATTEMPT_ID) ??
      liveOffers.find((o) => o.deliveryId === SEED_UNASSIGNED_DELIVERY_ID) ??
      liveOffers[0];

    // Decline through the same API contract the OfferAlert UI uses.
    const declineResult = await page.evaluate(async (attemptId) => {
      const response = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attemptId, action: 'decline', reason: 'busy' }),
      });
      const body = await response.json().catch(() => null);
      return { ok: response.ok, status: response.status, body };
    }, offer.attemptId);

    expect(declineResult.ok, `decline failed (${declineResult.status})`).toBe(true);
    expect(declineResult.body?.data?.declined ?? declineResult.body?.declined).toBe(true);

    // The declined attempt must leave this driver's pending queue — the
    // delivery itself stays unassigned so the dispatch engine can re-offer it.
    const offersAfter = await page.evaluate(async () => {
      const response = await fetch('/api/offers');
      const body = await response.json().catch(() => null);
      return body?.data?.offers ?? body?.offers ?? [];
    });
    const stillOffered = (offersAfter as Array<{ attemptId: string }>).some(
      (o) => o.attemptId === offer.attemptId
    );
    expect(stillOffered, 'declined offer must not remain in the pending queue').toBe(false);

    // The dashboard offer queue reflects the same state without crashing.
    await page.goto('/');
    await expect(page.getByText(/offer queue|pending offers/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
