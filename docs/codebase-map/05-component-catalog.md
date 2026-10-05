# 05 — Component Catalog

Components are identified by **responsibility**, not by folder. 20 material components. Component IDs (`C-nn`) are reused in every diagram and in the connection register.

---

## Index

| ID | Component | Type | Home |
|---|---|---|---|
| C-01 | Customer Marketplace | UI + API | `apps/web` |
| C-02 | Partner API | API (machine) | `apps/web/src/app/api/partner/*` |
| C-03 | Checkout Orchestration | Domain service | `apps/web/src/lib/checkout/*` |
| C-04 | Customer Stripe Webhook | Adapter (inbound) | `apps/web/src/app/api/webhooks/stripe` |
| C-05 | Chef Admin | UI + API | `apps/chef-admin` |
| C-06 | Kitchen OS | UI + API + rules | `apps/chef-admin` + 4 engine modules |
| C-07 | Ops Console | UI + API | `apps/ops-admin` |
| C-08 | Scheduled Processors | Worker | `apps/ops-admin/src/app/api/engine/processors/*` |
| C-09 | Finance Stripe Webhook | Adapter (inbound) | `apps/ops-admin/src/app/api/stripe/webhook` |
| C-10 | Driver App | UI + API | `apps/driver-app` |
| C-11 | Master Order Engine | Orchestrator | `packages/engine/src/orchestrators/master-order-engine.ts` |
| C-12 | Delivery Engine | Orchestrator | `packages/engine/src/orchestrators/delivery-engine.ts` |
| C-13 | Dispatch Trio | Orchestrator | `dispatch-orchestrator` + `offer-management` + `driver-matching` |
| C-14 | Money Services | Domain services | `ledger` · `payout` · `payout-engine` · `commerce` · `reconciliation` |
| C-15 | SLA & Notifications | Cross-cutting | `core/sla-manager` · `core/notification-*` |
| C-16 | Operations Command Gateway | Facade | `orchestrators/operations-command.gateway.ts` |
| C-17 | Data Access Layer | Library | `packages/db` |
| C-18 | Auth & Capability Layer | Cross-cutting | `packages/auth` + `services/platform-api-guards.ts` |
| C-19 | Routing / ETA | Adapter (outbound) | `packages/routing` |
| C-20 | Supabase Datastore | Store | `supabase/` |

---

## C-01 · Customer Marketplace

| Field | Value |
|---|---|
| **Type** | Next.js 14 App Router application (UI + API) |
| **Purpose** | The public storefront: discover chefs, browse menus, cart, checkout, track orders, account, reviews, support. |
| **Inputs** | Browser HTTP; Supabase Realtime order updates; Stripe.js confirmation callback |
| **Outputs** | HTML/RSC; JSON API; Stripe PaymentIntent creation; DB writes via engine and raw repositories |
| **Public interface** | 23 pages, 36 API routes (`/api/{cart,checkout,orders,addresses,favorites,loyalty,promos,referrals,reviews,storefronts,support,profile,eta,notifications,payment-methods,upload,auth,health}`) |
| **Dependencies** | `@ridendine/{auth,db,engine,routing,types,ui,utils,validation}`, `stripe`, `@stripe/react-stripe-js`, `zod`, `leaflet`, `@vercel/analytics`, `@vercel/speed-insights` |
| **State owned** | None exclusively. Writes `carts`, `cart_items`, `customer_addresses`, `orders`, `reviews`, `favorites`, `push_subscriptions`, `checkout_idempotency_keys` |
| **Configuration** | `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `PARTNER_API_KEY`, `HEALTH_CHECK_TOKEN` |
| **Security boundary** | Only internet-facing app serving anonymous traffic. `middleware.ts` protects **only** `/account` and `/checkout`; every API route enforces its own guard. Per-request CSP with nonce + `strict-dynamic`. |
| **Failure modes** | Supabase down → total outage; Stripe down → checkout 500 `PAYMENT_CONFIG_ERROR`/`PAYMENT_FAILED`; maintenance flag → all pages redirect to `/maintenance`; OSRM down → delivery fee falls back to Haversine × 1.3 |
| **Recovery** | Checkout failure path cancels the orphan order and marks the idempotency row `failed` so the customer can retry. Maintenance check fails **open** (cache TTL 30 s). |
| **Tests** | 70 test files — the best-covered app |
| **Evidence** | `apps/web/package.json`; `apps/web/src/middleware.ts: buildCsp, protectedRoutes`; `apps/web/vercel.json` |
| **Confidence** | 1.00 |

**Why this boundary exists:** it is the only surface anonymous humans touch, so it carries the CSP, the maintenance gate and the public marketplace read paths. **Architectural debt:** it also hosts the partner API and the primary Stripe webhook — two machine-facing responsibilities with entirely different threat models bolted onto the consumer app. A partner-API outage and a marketplace outage cannot be separated.

---

## C-02 · Partner API

| Field | Value |
|---|---|
| **Type** | Machine-facing HTTP API inside `apps/web` |
| **Purpose** | Let external storefronts sell Ridendine food. Ridendine is merchant of record. |
| **Inputs** | `POST /api/partner/checkout`, `POST /api/partner/checkout/quote`, `POST /api/partner/orders/[orderId]/cancel`, `GET /api/partner/storefronts`, `GET /api/partner/storefronts/[id]/menu` |
| **Outputs** | JSON incl. Stripe `clientSecret` + `publishableKey`; orders stamped `partner_id` and optionally `is_test` |
| **Public interface** | 5 routes |
| **Dependencies** | `lib/partner/{auth,signing,rate-limit,materialize}`, `lib/checkout/run-checkout`, `@ridendine/validation` |
| **State owned** | `api_partners`, `api_partner_keys`, `partner_webhooks` (shared with C-08) |
| **Configuration** | `PARTNER_API_KEY` (legacy fallback), `STRIPE_TEST_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET_TEST` |
| **Security boundary** | **Its own.** Key → SHA-256 → `api_partner_keys` lookup; per-key scopes (`quote`, `checkout`), per-key rate limit, optional HMAC body signature with timestamp. Legacy env key requires ≥16 chars and uses `timingSafeEqual`. Fails closed. |
| **Failure modes** | Test-mode key on a deployment without `STRIPE_TEST_SECRET_KEY` → **503 `STRIPE_TEST_MODE_UNAVAILABLE`, never a silent fall-through to the live key** (explicitly designed) |
| **Recovery** | `Idempotency-Key: <external-order-id>` header makes retries safe through the same idempotency machinery as customer checkout |
| **Tests** | 5 test files (`auth`, `signing`, `checkout`, `quote`, `cancel`) |
| **Evidence** | `apps/web/src/lib/partner/auth.ts: resolvePartnerContext`; `apps/web/src/app/api/partner/checkout/route.ts` |
| **Confidence** | 1.00 |

**Why this boundary exists:** a machine caller has no session, no cookies and no browser, so it needs key auth, signatures and its own rate limit. **What breaks if it fails:** partner revenue stops; marketplace unaffected. **Notable strength:** the test-mode design is unusually careful — a test-flagged order can never transact against the live Stripe key, and test-signed webhook events are kept out of finance, ledger, loyalty and payouts entirely.

---

## C-03 · Checkout Orchestration

| Field | Value |
|---|---|
| **Type** | Domain service (a function, not a class) |
| **Purpose** | The single path from "customer wants to pay" to "PaymentIntent exists". Server quote → risk → kitchen readiness → idempotency claim → order creation → Stripe → cleanup. |
| **Inputs** | `RunCheckoutParams { request, actor, customerId, input, partnerId, isTest }` — auth, rate limiting and body validation stay in the calling route |
| **Outputs** | A complete `Response`; `orders` row; `checkout_idempotency_keys` row; Stripe PaymentIntent |
| **Public interface** | `runCheckout()`, `buildCheckoutQuote()`, `roundMoney()`, `validateScheduledFor()` |
| **Dependencies** | C-11 (order creation), C-14 (Stripe service, risk), C-17, C-19 (distance) |
| **State owned** | `checkout_idempotency_keys` — authoritative |
| **Configuration** | `STRIPE_SECRET_KEY`, `STRIPE_TEST_SECRET_KEY`, tax rates via `platform_settings` |
| **Security boundary** | Trusts `(actor, customerId, input)`. **Always recomputes the price server-side and ignores the client's numbers** — client values are compared, not used. |
| **Failure modes** | `IDEMPOTENCY_CONFLICT` (409) on concurrent duplicate or payload mismatch · `RISK_BLOCKED` (403) · kitchen-readiness rejection (400) · `STRIPE_TEST_MODE_UNAVAILABLE` (503) · `PAYMENT_FAILED` (500) |
| **Recovery** | One `catch` funnels every post-claim failure: cancel the orphan order, mark the idempotency row `failed`, return a typed error. A `processing` row older than **2 minutes** is reclaimable by a conditional update (`status='processing' AND updated_at < cutoff`), so a crashed server does not lock the customer out forever. |
| **Tests** | Covered indirectly via `/api/checkout` and partner route tests |
| **Evidence** | `apps/web/src/lib/checkout/run-checkout.ts: runCheckout, IDEMPOTENCY_PROCESSING_STALE_MS, reclaimStaleIdempotencyRow` |
| **Confidence** | 1.00 |

**Why this boundary exists:** customer checkout and partner checkout must produce byte-identical orders, prices and idempotency semantics. Extracting it prevented two divergent money paths. **This is the best-engineered component in the repository.**

---

## C-04 · Customer Stripe Webhook

| Field | Value |
|---|---|
| **Type** | Inbound adapter |
| **Purpose** | Turn Stripe truth into Ridendine truth: authorise payment, submit the order to the kitchen, handle refunds, award loyalty. |
| **Inputs** | `POST /api/webhooks/stripe` — raw body + `stripe-signature` |
| **Outputs** | `orders.payment_status`, engine transitions `PAYMENT_AUTHORIZED → PENDING`, ledger writes, cart clear, loyalty accrual |
| **Public interface** | One route, `POST` only |
| **Dependencies** | C-11, C-14, C-17, `stripe-webhook-idempotency`, `stripe-webhook-finance`, loyalty service |
| **State owned** | `stripe_events_processed` — authoritative de-duplication ledger |
| **Configuration** | `STRIPE_WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET_TEST` |
| **Security boundary** | Signature verified **before anything else**. Tries the live secret, then the test secret; a genuinely bad signature is still rejected 400. Rate-limited by `RATE_LIMIT_POLICIES.webhookStripe` keyed on `event.id`. |
| **Failure modes** | Amount mismatch → **throws and refuses to mark paid** · order not found → throws · `submitToKitchen` failure → falls back to a guarded direct advance to `pending` · claim failure → 409 |
| **Recovery** | `claimStripeWebhookEventForProcessing` / `finalizeStripeWebhookSuccess` / `finalizeStripeWebhookFailure`. A replay returns `{ idempotentReplay: true }`. Stripe retries on 5xx. |
| **Tests** | Present under `apps/web/src/app/api/webhooks/stripe/__tests__` |
| **Evidence** | `apps/web/src/app/api/webhooks/stripe/route.ts: constructWebhookEvent, isPartnerTestEvent, stripePaymentAmountCents` |
| **Confidence** | 1.00 |

**Why this connection exists:** the browser cannot be trusted to report a successful payment. **What breaks if it fails: paid orders never reach the kitchen.** Customers are charged and nothing is cooked. This is the highest-consequence single failure in the system.

---

## C-05 · Chef Admin

| Field | Value |
|---|---|
| **Type** | Next.js application |
| **Purpose** | Chef-side operations: storefront, menu, availability, orders, analytics, growth, customers, reviews, payouts. |
| **Inputs** | Chef browser; Supabase Realtime new-order stream |
| **Outputs** | Menu/storefront writes; order transitions via engine; Stripe Connect onboarding links |
| **Public interface** | 30 pages, 68 API routes (largest API surface) |
| **State owned** | `chef_storefronts`, `menu_items`, `menu_categories`, `menu_item_options*`, `chef_kitchens`, availability |
| **Security boundary** | `getChefActorContext()` requires `chef_profiles.status === 'approved'`; `getOperatorKitchenContext()` re-validates the `x-brand-id` header against `kitchen_id` so a spoofed brand id **cannot cross kitchens** |
| **Failure modes** | Unapproved chef gets `null` context → 401 on every privileged route; a chef with no storefront gets `null` from `getChefActorContext` |
| **Tests** | 18 test files against 161 source files — **the weakest ratio of the four apps** |
| **Evidence** | `packages/engine/src/server.ts: getChefActorContext, getOperatorKitchenContext`; `apps/chef-admin/src/middleware.ts` |
| **Confidence** | 1.00 |

**Architectural debt:** 259 of the repository's 398 raw `supabase.from()` calls live here — 65% of the boundary erosion is in this one app, concentrated in the Kitchen OS routes.

---

## C-06 · Kitchen OS

| Field | Value |
|---|---|
| **Type** | Composite: 4 pure-rule engine modules + ~35 chef-admin API routes + 10 pages |
| **Purpose** | Run a kitchen as a business: recipes and versions, ingredient costing, inventory with a movement ledger, suppliers and receiving, purchase orders, production planning and batches, prep tasks, labour and time entries, close-day, service mode, kitchen P&L. |
| **Public interface** | `/api/{recipes,inventory,suppliers,purchase-orders,production,labor,kitchen,packaging,costs}/*` |
| **Rule modules** | `inventory.engine.ts` (138 lines), `production.engine.ts` (64), `purchasing.engine.ts` (48), `labor.engine.ts` (65) — **all pure functions with no DB access**, plus `costing.service`, `kitchen-pnl.service`, `labor-allocation.service`, `prep-consolidation.service`, `payroll.service`, `inventory-consumption.service`, `order-consumption.writer` |
| **State owned** | 32 tables added by migrations `00054`–`00063`: `recipes*`, `inventory_*`, `storage_locations`, `suppliers`, `supplier_items`, `receiving_batches`, `purchase_orders*`, `production_*`, `prep_task*`, `kitchen_*`, `labor_*`, `time_entries`, `packaging_items`, `menu_item_packaging`, `order_pack_checks` |
| **Source of truth note** | **On-hand stock is the signed sum of `inventory_stock_movements`.** `inventory_items.current_quantity` is explicitly documented as a cache the API keeps in step. |
| **Security boundary** | All 32 tables have RLS with a consistent three-policy pattern: `chef_manage_own_*` (ALL, authenticated), `ops_read_*` (SELECT, authenticated), `service_role_*` (ALL) |
| **Failure modes** | The cache column can drift from the movement ledger if a route writes one without the other — **no reconciliation job exists for this** |
| **Tests** | Engine rule modules are unit-tested; the route layer that owns all the DB writes is thinly tested |
| **Evidence** | `packages/engine/src/orchestrators/inventory.engine.ts: computeOnHand`; migrations `00055`–`00060`, `00062` |
| **Confidence** | 0.95 |

**Why this boundary is unusual:** the rules were correctly extracted into pure, testable modules, but **no repository was ever written for these domains** — so every route reaches into Supabase directly. `CLAUDE.md` names this as the actual outstanding task rather than the ratchet baseline. Confirmed: recipes, inventory, production, purchasing, suppliers, labour and kitchen have no `*.repository.ts`.

---

## C-07 · Ops Console

| Field | Value |
|---|---|
| **Type** | Next.js application |
| **Purpose** | Run the platform: live board, dispatch, exceptions, orders, deliveries, chefs, drivers, customers, finance (ledger, refunds, payouts, reconciliation, instant payouts, accounts), promos, announcements, support, team, compliance, analytics, health, settings. |
| **Public interface** | 40 pages, 57 API routes |
| **State owned** | `platform_users`, `platform_settings`, `system_alerts`, `announcements`, `promo_codes`, `audit_logs`, `ops_processor_runs` |
| **Security boundary** | Every route: `getOpsActorContext()` → `guardPlatformApi(actor, capability)`. `/dashboard/*` additionally gated by a server layout that redirects when the actor is not an active `platform_users` row. 8 roles × 30 capabilities. |
| **Failure modes** | A `platform_users` row that is inactive or has an unmapped role yields `null` actor → 401/redirect. Fail-closed. |
| **Tests** | 28 test files + 3 dedicated authz audit scripts (`high-risk-ops-authz-contracts`, `high-risk-ops-negative-authz`, `sean-super-admin-fixture`) |
| **Evidence** | `apps/ops-admin/src/app/dashboard/layout.tsx`; `packages/engine/src/services/platform-api-guards.ts` |
| **Confidence** | 1.00 |

**Gap:** `/dashboard/finance/payouts` is read-only. Nothing in the UI calls `/api/engine/payouts/{preview,execute,instant}` — see R-04.

---

## C-08 · Scheduled Processors

| Field | Value |
|---|---|
| **Type** | Worker endpoints (HTTP-triggered) |
| **Purpose** | The system's only background automation: SLA timers + timeout enforcement, expired-offer sweep, partner webhook delivery. |
| **Inputs** | `apps/ops-admin/vercel.json` crons: `/api/engine/processors/sla` @ `0 2 * * *`, `/expired-offers` @ `0 3 * * *`, `/partner-webhooks` @ `* * * * *` |
| **Outputs** | Order cancellations, `system_alerts`, delivery escalations, offer expiry, outbound partner webhooks, `ops_processor_runs` rows |
| **Public interface** | `POST` = do the work; `GET` = status ping only |
| **Security boundary** | `validateEngineProcessorHeaders`: `Authorization: Bearer $CRON_SECRET` **or** `x-processor-token: $ENGINE_PROCESSOR_TOKEN`. Fails closed when neither env var is set. |
| **Failure modes** | **The defining one: the scheduler calls `GET`; the work is in `POST`.** See R-01. Secondary: `sla` and `expired-offers` claim a run in `ops_processor_runs` (unique on `processor_name, idempotency_key`) so a double-fire skips; `partner-webhooks` does **not** claim a run and so is neither idempotent at the processor level nor visible to the health endpoint. |
| **Recovery** | Manual: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" <ops>/api/engine/processors/sla` |
| **Tests** | **None cover the HTTP method contract.** This is exactly the untested seam where R-01 lives. |
| **Evidence** | `apps/ops-admin/vercel.json: crons`; three `route.ts` files; `packages/utils/src/processor-auth.ts`; `scripts/local-cron.mjs` (uses `method: 'POST'`) |
| **Confidence** | 1.00 for the structure; 0.90 for the R-01 conclusion |

**Contradiction inside the component:** `processors/sla/route.ts` says *"Called by Vercel Cron every minute"*; `vercel.json` schedules it once a day at 02:00. Expiring stale driver offers **once per day** would be operationally wrong even if the method mismatch did not exist.

---

## C-09 · Finance Stripe Webhook

| Field | Value |
|---|---|
| **Type** | Inbound adapter |
| **Purpose** | Payout-lifecycle events only: `transfer.created`, `payout.paid`, `payout.failed`. |
| **Security boundary** | `STRIPE_WEBHOOK_SECRET_OPS`, falling back to `STRIPE_WEBHOOK_SECRET` |
| **Design note** | Returns `{ received: true, ignored: true }` for any other event type **before** claiming the idempotency key — deliberately, so it can never mark a `payment_intent.*` event processed and starve C-04 of its kitchen-submit work. The comment says so explicitly. |
| **Failure modes** | Missing both secrets → throws on first request; handler error → `finalizeStripeWebhookFailure` + 500 so Stripe retries |
| **Evidence** | `apps/ops-admin/src/app/api/stripe/webhook/route.ts: FINANCE_TYPES, webhookSecret` |
| **Confidence** | 1.00 |

---

## C-10 · Driver App

| Field | Value |
|---|---|
| **Type** | Next.js PWA |
| **Purpose** | Go online, receive and respond to offers, navigate, capture proof of delivery, report issues, see earnings, cash out. |
| **Inputs** | Driver browser; geolocation; Supabase Realtime offer stream |
| **Outputs** | `driver_presence` pings, delivery transitions, proof uploads, instant payout requests |
| **Public interface** | 11 pages, 19 API routes |
| **State owned** | `driver_presence`, `driver_notification_preferences`, `driver_documents` |
| **Configuration** | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (subscriptions only — see below) |
| **Security boundary** | `getDriverActorContext()` requires `drivers.status === 'approved'`; `verifyDriverOwnsDelivery` on delivery mutations. Middleware matcher deliberately excludes `sw.js`, `manifest.json`, `manifest.webmanifest`, `offline.html` so the service worker can register. |
| **Failure modes** | **Presence TTL is 90 seconds.** A backgrounded tab stops posting location and the driver silently disappears from dispatch. Location posts every 15 s while online. |
| **Tests** | 32 test files against 89 source files — the best ratio |
| **Evidence** | `packages/engine/src/orchestrators/driver-matching.service.ts: PRESENCE_TTL_SECONDS`; `apps/driver-app/src/middleware.ts: config.matcher` |
| **Confidence** | 1.00 |

**Half-built feature:** `push_subscriptions` are collected and stored (`/api/notifications/subscribe`), but **no code anywhere sends a push** — no `web-push` dependency, no VAPID private key, no sender. See `20-legacy-duplicate-and-dead-code.md` D-07.

---

## C-11 · Master Order Engine

| Field | Value |
|---|---|
| **Type** | Canonical orchestrator — **the single sanctioned writer of order lifecycle state** |
| **Purpose** | Every legal order transition, with audit and events. |
| **Public interface** | `transitionOrder`, `chefAccept/chefReject`, `markPreparing`, `markReadyForPickup`, `requestDriverAssignment`, `markDriverOffered/Assigned`, `markPickedUp`, `markDelivered`, `completeOrder`, `cancelOrder`, `refundOrder`, `authorizePayment`, `submitToChef`, `createOrderFromCart`, `syncFromDelivery`, `getAllowedActions`, `opsOverride` — 939 lines |
| **Dependencies** | `order-state-machine` (transition maps), `AuditLogger`, `DomainEventEmitter`, optional `PaymentAdapter` |
| **State owned** | `orders.engine_status` (canonical) and `orders.status` (legacy mirror, via `ENGINE_TO_LEGACY_ORDER_STATUS`) |
| **Failure modes** | `InvalidTransitionError` on any transition absent from `ORDER_TRANSITION_MAP` |
| **Evidence** | `packages/engine/src/orchestrators/master-order-engine.ts`; `order-state-machine.ts: ORDER_TRANSITION_MAP, assertValidOrderTransition` |
| **Confidence** | 1.00 |

**Blast radius:** `CLAUDE.md` records `MasterOrderEngine` as **CRITICAL** in the GitNexus index (122 dependent symbols). Treat any change here as platform-wide.

---

## C-12 · Delivery Engine

636 lines. Owns `deliveries` state via `DELIVERY_TRANSITION_MAP`. Public: `transitionDelivery`, `offerDeliveryToDriver`, `driverAccept/RejectDelivery`, `markEnRouteToPickup`, `markArrivedAtPickup`, `markPickedUp`, `markEnRouteToCustomer`, `markArrivedAtCustomer`, `markDelivered`, `failDelivery`, `cancelDelivery`. Holds a reference to C-11 so delivery progress can be mirrored onto the order. Terminal delivery states: `delivered`, `failed`, `cancelled`. Evidence: `delivery-engine.ts`; `order-state-machine.ts: DELIVERY_TRANSITION_MAP`. Confidence 1.00.

---

## C-13 · Dispatch Trio

Three collaborating classes, wired in `createCentralEngine`:

| Part | Lines | Responsibility |
|---|---|---|
| `DriverMatchingService` | — | Find eligible drivers (presence fresh within 90 s, within radius), score them, rank by real ETA when OSRM answers |
| `OfferManagementService` | 702 | Offer to next driver, accept/decline/respond, expire attempts, sweep expired offers |
| `DispatchOrchestrator` | 532 | `requestDispatch`, `onOrderReadyForPickup`, `manualAssign`, `forceAssign`, `reassignDelivery`, `acceptOffer`, `declineOffer`, `findAndAssignDriver`, `processExpiredOffers`, `updateDeliveryStatus`, `getDispatchBoard` |

**Scoring formula** (`calculateDriverAssignmentScore`) — VERIFIED, exact:

```
score = (12 − distance_km) × 10        [floored at 0]
      + rating × 5                      [rating defaults to 4]
      + min(total_deliveries, 500) / 25
      + fairness_score × 12
      − active_workload × 25
      − recent_declines × 8
      − recent_expiries × 10
```

**What breaks if the trio fails:** ready orders sit in `DISPATCH_PENDING` with no driver. `packages/engine/src/services/dispatch.service.ts` is a **dead second implementation** — exported from the barrel, referenced only by its own test, called by nothing. Do not build on it.

---

## C-14 · Money Services

| Service | File | Responsibility |
|---|---|---|
| `LedgerService` | `services/ledger.service.ts` (334) | Idempotent double-entry-style writes: `recordCustomerCapture`, `recordOrderPayment`, `recordTipPayable`, `recordRefund`, `recordPayout`, `recordInstantPayoutFee`, `reverseInstantPayoutFee`. Key = `${entryType}:${sourceId}`. |
| `PayoutService` | `services/payout.service.ts` (793) | `previewChefRun`, `previewDriverRun`, execute, instant payouts |
| `PayoutEngine` | `orchestrators/payout-engine.ts` (294) | Payout status transitions + split math |
| `CommerceLedgerEngine` | `orchestrators/commerce.engine.ts` (1,051) | Payment auth/capture, the full refund workflow (request → approve → process → Stripe refund → deny), payout holds, financial summaries |
| `ReconciliationService` | `services/reconciliation.service.ts` (198) | `runDaily(date)`, `resolveManual` — Stripe ↔ ledger |
| `StripeService` | `services/stripe.service.ts` | Client factory (live/test), `assertStripeConfigured`, customer resolution, publishable-key selection |

**State owned:** `ledger_entries` (unique index `uq_ledger_entries_idempotency_key`, migration `00019`), `payout_runs` (partial unique index `payout_runs_one_processing_per_type` on `status='processing'`, migration `00032`), `payouts`, `refunds`, `stripe_events_processed`.

**Split rules — VERIFIED:** platform keeps `PLATFORM_FEE_PERCENT = 15%` of subtotal; driver receives `DRIVER_PAYOUT_PERCENT = 80%` of the delivery fee. The same two constants are applied in **two places** (`payout-engine.ts` and `commerce.engine.ts`) — duplicated math, currently consistent.

**Weakness:** `LedgerService.insertIdempotent` does select-then-insert and returns `{ inserted: false, error }` when the insert fails. Under a genuine concurrent duplicate the unique index rejects the second write and the caller sees an **error rather than an idempotent no-op** — unlike checkout, which handles PostgreSQL `23505` explicitly. See failure mode F-09.

---

## C-15 · SLA & Notifications

`SLAManager` (timers, warnings, breaches), standalone `sla-checks` (`checkChefAcceptanceTimeout` 5 min, `checkDriverAssignmentTimeout` 10 min, `checkStalePreparingOrders` 45 min), `NotificationSender` with pluggable providers, `NotificationTriggers`, `sms-templates`, `public-broadcast-sanitizer`, `DomainEventEmitter` (queued, flushed with `engine.events.flush()`).

Providers registered in `createCentralEngine`: `createResendProvider()` (active only with `RESEND_API_KEY`), `createTwilioProvider()` (active only with `TWILIO_*`). Both no-op silently when unconfigured, falling back to database notifications.

**Entirely dependent on C-08.** If the SLA processor does not run, none of the three timeout checks ever fires.

---

## C-16 · Operations Command Gateway

480 lines, a single public method: `execute(command, actor)`. A command facade over `masterOrder`, `platform`, `dispatch`, `ops`, `commerce`, `support`, `payoutAutomation`, `sla`. Commands are validated by Zod schemas from `@ridendine/validation` (e.g. `bankPayoutCommandSchema`) before dispatch. Used by `/api/engine/payouts` POST and other ops action routes. **Why it exists:** one audited, schema-validated entry point for operator mutations instead of scattered ad-hoc writes.

---

## C-17 · Data Access Layer (`@ridendine/db`)

Three clients — `browser.ts` (anon key, RLS applies), `server.ts` (cookie-bound SSR client, RLS applies as the signed-in user), `admin.ts` (**service role, bypasses RLS**, module-level singleton, throws if `typeof window !== 'undefined'`).

22 repositories: `address`, `analytics`, `audit`, `cart`, `chef`, `customer`, `delivery`, `driver-presence`, `driver`, `finance`, `menu`, `notification`, `ops`, `order`, `partner`, `platform`, `processor-run`, `promo`, `review`, `storefront`, `support`, `team`.

Plus `realtime/{channels,events}`, `hooks/use-realtime`, `schema/`, and `generated/database.types.ts` (**generated — never hand-edit**; regenerate with `pnpm db:generate`).

**Known erosion:** 398 raw `supabase.from()` calls bypass these repositories — `chef-admin` 259, `web` 71, `driver-app` 53, `ops-admin` 15. The `db-boundary/no-raw-supabase-from` ESLint rule counts them and `scripts/audit/db-boundary-ratchet.mjs` blocks **new** ones. Verified passing at baseline.

---

## C-18 · Auth & Capability Layer

`createAuthMiddleware(config)` → per-app `middleware.ts`. Uses `supabase.auth.getUser()` (server-verified JWT), never `getSession()`. Optional per-request CSP nonce builder. `ALLOW_DEV_AUTOLOGIN` short-circuits auth **only** when `NODE_ENV !== 'production'`.

Actor resolvers in `packages/engine/src/server.ts`: `getCustomerActorContext`, `getChefActorContext`, `getChefBasicContext`, `getOperatorKitchenContext`, `getDriverActorContext`, `getOpsActorContext`. Ownership verifiers: `verifyChefOwnsStorefront`, `verifyChefOwnsOrder`, `verifyDriverOwnsDelivery`, `verifyMenuItemOwnership`.

`guardPlatformApi(actor, capability)` → 30-capability × 8-role matrix, fail-closed 401/403.

**Structural consequence:** all actor resolvers themselves use `createAdminClient()` to look up the profile row. The session establishes *who you are*; the service role does the *lookup*; application code decides *what you may do*.

---

## C-19 · Routing / ETA

`EtaService` over a `RoutingProvider` interface. `OsrmProvider` — `https://router.project-osrm.org`, 12 s timeout, 2 retries, WGS84 validation. `MapboxProvider` implements the same interface and is **never instantiated** (INACTIVE). Instantiated at exactly two places: `packages/engine/src/services/eta.service.ts: createEtaService` and `apps/web/src/app/api/eta/route.ts`.

Also here: `polyline` decoding, `progress` tracking, `rankDrivers` used by C-13.

---

## C-20 · Supabase Datastore

PostgreSQL 17. 112 tables, all with RLS enabled. 316 policies, 34 functions, 37 triggers, 13 `SECURITY DEFINER` occurrences. 62 forward-only migrations. Local ports: API 54321, DB 54322, Studio 54323, Inbucket 54324. Storage bucket `profiles` (public, 5 MB, image MIME allowlist). Realtime channels used by all four apps.

**This is the single point of failure for the entire platform.** No fallback, no replica, no degraded read path exists anywhere in the code.
