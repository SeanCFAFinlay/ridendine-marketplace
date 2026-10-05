# 10 — Interfaces and User Journeys

104 pages, 180 API route files across four applications.

---

## 1. Page inventory

### 1.1 `apps/web` — Customer (23 pages)

| Route | Auth | Notes |
|---|---|---|
| `/` | public | Marketplace home |
| `/chefs`, `/chefs/[slug]` | public | Discovery + storefront |
| `/about`, `/how-it-works`, `/contact`, `/chef-resources`, `/chef-signup` | public | Marketing |
| `/privacy`, `/terms` | public | Legal |
| `/maintenance` | public | Redirect target when the flag is on |
| `/auth/login`, `/auth/signup`, `/auth/forgot-password` | public | `signup` reads `?ref=` |
| `/cart` | **not middleware-protected** | Cart is server-side, keyed by customer |
| `/checkout` | **protected** | One of only two protected prefixes |
| `/account`, `/account/addresses`, `/account/orders`, `/account/favorites`, `/account/settings` | **protected** | |
| `/orders/[id]/confirmation` | protected | **Canonical** confirmation |
| `/order-confirmation/[orderId]` | protected | **Legacy — permanent redirect** to the canonical path (IRR-011). Intentional, 15 lines. |

### 1.2 `apps/chef-admin` — Chef (30 pages)

`/`, `/auth/{login,signup,forgot-password}`, `/privacy`, `/terms`, and `/dashboard` plus:
`analytics` · `availability` · `costs` · `customers` · `growth` · `inventory` · `kitchen` · `kitchen/board` · `kitchen/pnl` · `kitchen/setup` · `labor` · `menu` · `orders` · `orders/[id]` · `payouts` · `production` · `recipes` · `recipes/[id]` · `reviews` · `settings` · `storefront` · `storefront/setup` · `suppliers`

Default-protect middleware; every dashboard page needs an **approved** chef profile.

### 1.3 `apps/ops-admin` — Operations (40 pages)

`/`, `/auth/login`, `/internal/command-center`, and `/dashboard` plus:
`activity` · `analytics` · `announcements` · `automation` · `chefs` · `chefs/[id]` · `chefs/approvals` · `compliance` · `customers` · `customers/[id]` · `deliveries` · `deliveries/[id]` · `dispatch` · `drivers` · `drivers/[id]` · `exceptions` · `finance` · `finance/accounts/chefs` · `finance/accounts/chefs/[id]` · `finance/accounts/drivers` · `finance/accounts/drivers/[id]` · `finance/instant-payouts` · `finance/payouts` · `finance/payouts/[runId]` · `finance/reconciliation` · `finance/refunds` · `health` · `integrations` · `map` · `orders` · `orders/[id]` · `promos` · `reports` · `settings` · `support` · `team`

`/dashboard/*` is gated by a server layout requiring an active `platform_users` row; finance pages additionally check `FINANCE_PAGE_ROLES`.

### 1.4 `apps/driver-app` — Driver (11 pages)

`/`, `/auth/{login,signup}`, `/dashboard`, `/delivery/[id]`, `/earnings`, `/history`, `/profile`, `/settings`, `/privacy`, `/terms`. PWA: service worker, manifest, offline page — all excluded from the middleware matcher.

## 2. API surface by app

| App | Routes | Domains |
|---|---|---|
| `web` | 36 | auth, cart, checkout (+quote), orders (+cancel/reorder/payment-status), addresses, favorites, loyalty, referrals (+apply), promos/validate, reviews, storefronts (+menu), support (+tickets), profile, payment-methods, notifications (+subscribe), eta, upload, health, **partner ×5**, **webhooks/stripe** |
| `chef-admin` | 68 | auth, storefront (+availability), menu (+categories/options/values/cost), orders, customers, analytics, growth, profile, payouts (setup/request), upload, health, **Kitchen OS**: recipes, inventory, suppliers, purchase-orders, production, labor, kitchen, packaging, costs |
| `ops-admin` | 57 | auth, orders (+refund), deliveries, drivers (+operations), chefs, customers (+notify), support, promos, surge, team, announcements, audit/recent, analytics (+trends), export, health, ops/live-board, fixtures/reset, internal/command-center, **engine ×18**, **processors ×3**, **cron ×5 (legacy)**, **stripe/webhook** |
| `driver-app` | 19 | auth (login/signup/logout), deliveries (+issue/proof), driver (presence/readiness/shift/notification-preferences), offers, location, earnings, payouts (instant/setup), upload, health |

## 3. Journey A — happy path: customer orders dinner

| Step | Surface | Backend | Notes |
|---|---|---|---|
| 1 | `/` | SSR via `@ridendine/db` | Featured storefronts |
| 2 | `/chefs` | `GET /api/storefronts` | Discovery |
| 3 | `/chefs/[slug]` | `GET /api/storefronts/[id]/menu` | Storefront + trust signals |
| 4 | Add to cart | `POST /api/cart` | Cart persisted server-side |
| 5 | `/cart` | `GET /api/cart` | Review |
| 6 | `/checkout` | **middleware forces login** | `protectedRoutes` |
| 7 | Address select | `GET /api/addresses` | |
| 8 | Live quote | `POST /api/checkout/quote` | Same math as checkout; no side effects |
| 9 | Pay | `POST /api/checkout` → `runCheckout` | Returns `clientSecret` + `publishableKey` |
| 10 | Card entry | Stripe.js in an iframe | **Card data never reaches Ridendine** |
| 11 | Confirm | Stripe → `POST /api/webhooks/stripe` | Async; the browser does not wait for it |
| 12 | `/orders/[id]/confirmation` | `GET /api/orders/[id]` | |
| 13 | Tracking | Supabase Realtime (`use-order-stream`) | Live status |
| 14 | Delivered | | |
| 15 | Review | `POST /api/reviews` | |

**Loading / empty / error states:** the shared design system provides `EmptyState`, `StatusBadge`, `KpiTile`, `PageHeader`; `apps/web/src/app/{loading,error,not-found}.tsx` exist at the root. Coverage of empty and error states below the root was not exhaustively audited.

## 4. Journey B — failure path: card declines

| Step | What happens | Where |
|---|---|---|
| 1 | `POST /api/checkout` succeeds; the order exists in `checkout_pending`; the idempotency row is `processing`→`completed` | `runCheckout` |
| 2 | The customer's card is declined **at Stripe, in the browser** | Stripe.js |
| 3 | Stripe fires `payment_intent.payment_failed` | NET-014 |
| 4 | The webhook handles it and the order does not advance to the kitchen | webhook switch |
| 5 | The customer retries. The idempotency row is `completed`, so **the stored payload is replayed** — the same `clientSecret`, the same order. No duplicate order is created. | step 16 of the checkout trace |
| 6 | If instead the failure happened *server-side* after order creation, the `catch` cancels the order and marks the row `failed`, so the retry starts clean | `run-checkout.ts` catch |

**This is the correct behaviour and it is well implemented.** The one gap: if the customer simply abandons the page after step 1, the order sits in `checkout_pending` indefinitely — **no sweeper cancels abandoned pre-payment orders.** `checkChefAcceptanceTimeout` only covers orders that already reached `pending`. Flagged F-15.

## 5. Journey C — chef receives and cooks an order

`/dashboard/orders` (Realtime via `use-storefront-orders-realtime`) → accept (`PATCH /api/orders/[id]`, `chefAccept`) → `/dashboard/kitchen/board` ticket → mark preparing → mark ready → **`onOrderReadyForPickup` creates the delivery row and starts dispatch**. Kitchen OS runs alongside: `/dashboard/inventory` consumption, `/dashboard/production` batches, `/dashboard/labor` clock-in/out, `/dashboard/kitchen/pnl`.

## 6. Journey D — driver

`/dashboard` go online → `POST /api/driver/presence` + `POST /api/location` every 15 s → offer arrives over Realtime (`offer-alert`) → `POST /api/offers` accept → `/delivery/[id]` map (Leaflet + OSRM polyline) → status transitions → `POST /api/deliveries/[id]/proof` → `/earnings` → `POST /api/payouts/instant`.

**Silent failure mode:** if the tab is backgrounded for 90 seconds the driver stops appearing in `findEligibleDrivers`. There is no UI warning that this has happened. Flagged F-06.

## 7. Journey E — ops handles a stuck order

`/dashboard` live board → `/dashboard/exceptions` → `/dashboard/orders/[id]` → override via `OperationsCommandGateway` → audit trail in `/dashboard/activity`. Dispatch intervention at `/dashboard/dispatch` (manual assign, force assign, reassign).

## 8. Interface findings

| ID | Finding | Status |
|---|---|---|
| UI-01 | **Referral share link is doubly wrong** — `https://ridendine.com/signup?ref=` : wrong TLD and a non-existent path. The capture side (`/auth/signup?ref=`) works. | VERIFIED — R-05 |
| UI-02 | `storefront-form.tsx` shows the chef their public URL as `ridendine.com/chefs/{slug}`; production is `ridendine.ca`. Cosmetic but user-visible and wrong. | VERIFIED |
| UI-03 | **Backend capability with no interface:** `/api/engine/payouts/{preview,execute,instant}` — no page fetches them. `/dashboard/finance/payouts` is a read-only list. | VERIFIED — R-04 |
| UI-04 | **Backend capability with no interface:** `/api/engine/payouts/instant/[id]` — `/dashboard/finance/instant-payouts` contains no `fetch` call at all. | VERIFIED |
| UI-05 | **Interface promise with no backend:** the web app collects web-push subscriptions (`/api/notifications/subscribe`, `use-push-notifications`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`) but **nothing in the repository ever sends a push** — no `web-push` dependency, no VAPID private key, no sender. | VERIFIED |
| UI-06 | `/internal/command-center/docs/[...docPath]` serves any file under `docs/` to **any authenticated session**, with no capability check — while the sibling `change-requests` API correctly requires `team_manage`. Disabled in production unless `INTERNAL_COMMAND_CENTER_ENABLED=true`. | VERIFIED |
| UI-07 | The command-center `change-requests` API **writes to the repository filesystem at runtime** (`docs/ui/change-requests.json`). Vercel's runtime filesystem is read-only outside `/tmp`, so this would throw in production even when enabled. | INFERRED 0.85 |
| UI-08 | `/dashboard/automation` exists as a page. Given R-01, whatever it displays about scheduled automation is describing work that is not running. | POSSIBLE 0.6 — page contents not read |
| UI-09 | Legacy `/order-confirmation/[orderId]` is an **intentional** permanent redirect, documented in code and in `customer-ordering.ts`. **Not** a defect. | VERIFIED |

## 9. Orphan analysis — method and honest limits

A heuristic scan matched each API route's path prefix against all `.ts`/`.tsx` under the same app, excluding the route file itself and `__tests__`. 26 routes had no literal match.

**The heuristic has known false positives and negatives, and both were checked by hand:**

- **False positives (route *is* used):** `/api/webhooks/stripe`, `/api/stripe/webhook`, `/api/engine/processors/*`, `/api/cron/*` — called by external systems, not by app code. `/api/labor/clock-in` and `/api/labor/clock-out` are built with a template literal (`` `/api/labor/clock-${dir}` ``) and so cannot match a literal search; the labour page does call them.
- **True positives, confirmed by direct inspection:** `/api/engine/payouts/{execute,preview,instant,instant/[id]}` (UI-03, UI-04).
- **Not individually confirmed:** `/api/inventory/{counts,reorder}`, `/api/kitchen/{brands/clone,daily-summary}`, `/api/labor/{costs,shifts}`, `/api/production/plan/consolidated`, `/api/audit/recent`, `/api/deliveries` and `/api/deliveries/[id]` in ops-admin, `/api/checkout/quote`, `/api/partner/checkout/quote`, `/api/upload`, `/api/auth/signup`, `/api/driver/auth/logout`. Several of these are near-certainly reached through dynamic paths or form actions.

**Conclusion, stated with its limits:** the only orphan claims made as VERIFIED in this package are UI-03 and UI-04, each confirmed by reading the relevant pages. The rest are recorded as POSSIBLE and would need a runtime trace or a per-file read to settle.

## 10. Accessibility and responsiveness

`scripts/smoke/responsive-production-smoke.cjs` and `pnpm smoke:responsive` exist and are wired into `test:wiring-fixes`, which passes. `scripts/ui/generate-ui-screenshots.ts` produces a visual registry. **No automated accessibility testing (axe, pa11y, Lighthouse CI) exists anywhere in the repository.** WCAG conformance is UNKNOWN.
