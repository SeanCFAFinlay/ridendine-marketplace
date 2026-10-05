# 08 — Workflows and Domain Logic

Control flow, data flow, state transitions and side effects — kept separate — plus every business rule that makes this program specific to food delivery.

Diagram source: [`diagrams/primary-workflow.mmd`](diagrams/primary-workflow.mmd)

---

## Part 1 — Primary workflow, traced end to end

**Trigger:** an authenticated customer submits `POST /api/checkout`.
**Outcome:** an order exists, a PaymentIntent exists, and the browser has a `clientSecret`.

Each step lists: component · gate · input · transformation · output · state change · side effect · failure branch.

| # | Component & symbol | Gate / condition | Transformation | State change | External side effect | Failure branch |
|---|---|---|---|---|---|---|
| 1 | `apps/web/src/middleware.ts` | `pathname` starts with `/checkout`? | Build CSP nonce; maintenance lookup | — | `platform_settings` read | maintenance on → 307 `/maintenance`; lookup fails → **fail open** |
| 2 | `middleware` → `supabase.auth.getUser()` | user must exist for `/checkout` | Verify JWT with Supabase | — | Supabase Auth call | 307 `/auth/login` |
| 3 | `api/checkout/route.ts` | `RATE_LIMIT_POLICIES.checkout` — 3 / 60 s, composite key | Counter increment | Redis or memory counter | Upstash call (if configured) | **429, fail closed** |
| 4 | `getCustomerActorContext()` | `customers.user_id = auth user` | Resolve `customerId` | — | admin-client read | 401 |
| 5 | `runCheckout()` → `validateScheduledFor()` | `scheduledFor` in a legal window | Parse/normalise | — | — | 400 `VALIDATION_ERROR` |
| 6 | `buildCheckoutQuote()` | Cart exists, belongs to customer, non-empty, matches storefront | Load cart + items + menu | — | DB reads | typed 4xx |
| 7 | `buildCheckoutQuote()` → `geocodeAddress` / OSRM | Address geocodable | Compute `deliveryDistanceKm` | — | **Nominatim + OSRM** | falls back to Haversine × 1.3, then to `BASE_DELIVERY_FEE` |
| 8 | `resolveServiceAreaSurge()` | service-area row present | Read `surge_multiplier` | — | DB read | defaults to `1.0` |
| 9 | `calculateDeliveryFee()` | — | base + distance×surge + small-order, capped | — | — | — |
| 10 | `TaxConfigService.getTaxRates()` | 60 s cache | Read `platform_settings.hst_rate`, `service_fee_percent` | — | DB read | **falls back to constants 13% / 8%** |
| 11 | `computeServerQuote()` | — | serviceFee, tax, total; **client's numbers compared, never used** | — | — | mismatch is recorded, not fatal |
| 12 | `evaluateCheckoutRisk()` | customerId + cartId present, amount valid, currency in `['cad','usd']` | Score | — | — | **403 `RISK_BLOCKED`** + audit `override` entry |
| 13 | `engine.kitchen.validateCustomerCheckoutReadiness()` | Storefront open, not paused, items not sold out | — | — | DB reads | 400 with the engine's own code |
| 14 | `deriveIdempotencyKey()` | `Idempotency-Key` header, else SHA-256 of a canonical payload | 64–128 char key | — | — | — |
| 15 | `upsertCheckoutIdempotencyRecord()` | unique `(customer_id, idempotency_key)` | select → insert; `23505` → re-select | **`checkout_idempotency_keys` = processing** | — | see 16 |
| 16 | idempotency branch | `request_hash` differs → 409 · `completed` → replay stored payload · `processing` fresh → 409 · `processing` older than **120 s** → conditional reclaim | — | possible reclaim | — | 409 `IDEMPOTENCY_CONFLICT` |
| 17 | `assertStripeConfigured()` | `STRIPE_SECRET_KEY` present and safe | — | — | — | 500 `PAYMENT_CONFIG_ERROR` |
| 18 | test-mode guard | `isTest && !isStripeTestModeConfigured()` | — | — | — | **503 `STRIPE_TEST_MODE_UNAVAILABLE` — never falls back to the live key** |
| 19 | `engine.orderCreation.createOrder()` | Engine validation | Create order + items | **`orders` created**, `order_items` created | — | throws `CheckoutFailure` → step 24 |
| 20 | direct `orders` update | — | Persist the canonical quote snapshot; stamp `partner_id`, `is_test`, `scheduled_for` | **`orders` totals set**; status → `scheduled` if scheduled | — | throws → step 24 |
| 21 | `getOrCreateStripeCustomer()` | per-mode (live vs test) | Resolve/create Stripe customer | — | **Stripe API** | `.catch(() => null)` — proceeds without a customer id |
| 22 | `stripe.paymentIntents.create()` | idempotency key `checkout:{customerId}:{key}` | Build PI with full metadata; saved card → `confirm:true`, else `automatic_payment_methods` | — | **Stripe PaymentIntent created** | throws → step 24 |
| 23 | idempotency update | — | Store `response_payload` | **row = completed**, `order_id`, `payment_intent_id` | — | — |
| **24** | **catch** | any failure after step 15 | `engine.orders.cancelOrder(reason='payment_failed')` then `markIdempotencyRecordFailed` | order cancelled, row = failed | — | cancel failure is logged and swallowed so the row is always released |

**Then, asynchronously:**

| # | Step |
|---|---|
| 25 | Browser confirms the card with Stripe.js using `clientSecret` and the returned `publishableKey`. |
| 26 | Stripe → `POST /api/webhooks/stripe`. Signature verified (live secret, then test secret). |
| 27 | `claimStripeWebhookEventForProcessing` claims `stripe_events_processed`; a replay returns `{ idempotentReplay: true }`. |
| 28 | **Amount assertion:** `amount_received` must equal `round(orders.total × 100)` exactly. Mismatch throws — the order is never marked paid. |
| 29 | Test-flagged order → `payment_status='completed'` **only**. No kitchen, no ledger, no loyalty, no payout. |
| 30 | Real order → `authorizePayment` → `payment_status='completed'` → `submitToKitchen`. On `submitToKitchen` failure, a guarded direct advance to `pending` (`.eq` guard makes it idempotent against a concurrent cancel). |
| 31 | Cart cleared; loyalty points awarded. |
| 32 | Chef accepts (`PENDING → ACCEPTED`), prepares (`→ PREPARING`), marks ready (`→ READY`). |
| 33 | `markReadyForPickup` → `DispatchOrchestrator.onOrderReadyForPickup` → **the `deliveries` row is created here**, not at payment. |
| 34 | `DriverMatchingService.findEligibleDrivers` (presence < 90 s old, within radius) → score → `rankCandidates` via OSRM → `OfferManagementService.offerToNextDriver`. |
| 35 | Driver accepts → `DRIVER_ASSIGNED` → `DRIVER_EN_ROUTE_PICKUP` → `PICKED_UP` → `DRIVER_EN_ROUTE_DROPOFF` → `DELIVERED`. |
| 36 | `completeOrder` → `COMPLETED`; `CommerceLedgerEngine` and `LedgerService` write the money lines. |
| 37 | Customer may review. |

### Control flow vs data flow vs state vs side effect

| Kind | Where it lives |
|---|---|
| **Control flow** (what decides an action happens) | `middleware.ts` (auth/maintenance) · rate-limit policies · `evaluateCheckoutRisk` · `validateCustomerCheckoutReadiness` · idempotency branch · `ORDER_TRANSITION_MAP` · `guardPlatformApi` |
| **Data flow** (what moves) | cart → quote → order snapshot → PaymentIntent metadata → webhook event → ledger entries |
| **State transitions** (durable change) | `checkout_idempotency_keys.status` · `orders.engine_status` + `orders.status` · `deliveries.status` · `assignment_attempts.response` · `payouts.status` · `stripe_events_processed` |
| **External side effects** | Stripe customer + PaymentIntent + refunds + transfers · Nominatim + OSRM queries · Resend/Twilio sends · Supabase Storage writes · outbound partner webhooks |

### Gate evaluation order, and what failure means

| Order | Gate | On failure |
|---|---|---|
| 1 | Maintenance mode | **defer** (redirect) — fails **open** if the lookup fails |
| 2 | Session | **deny** (307) |
| 3 | Rate limit | **deny** (429) — fails **closed** for checkout/auth/writes; **open** for webhooks/public reads |
| 4 | Actor resolution | **deny** (401) |
| 5 | Capability (ops only) | **deny** (403) |
| 6 | Schema validation (Zod) | **deny** (400 with per-field details) |
| 7 | Business precondition (cart, storefront, address) | **deny** (typed 4xx) |
| 8 | Risk | **deny** (403) + audit |
| 9 | Kitchen readiness | **deny** (400) |
| 10 | Idempotency | **defer** (409) or **replay** (200) |
| 11 | Stripe configuration | **deny** (500/503) |
| 12 | State-machine transition | **deny** (`InvalidTransitionError`) |

---

## Part 2 — Domain logic

### 2.1 Order state machine — VERIFIED, authoritative

`packages/engine/src/orchestrators/order-state-machine.ts: ORDER_TRANSITION_MAP`. 24 engine statuses. Anything outside the map throws `InvalidTransitionError`.

```
DRAFT → CHECKOUT_PENDING → { PAYMENT_AUTHORIZED, PAYMENT_FAILED }
PAYMENT_AUTHORIZED → { PENDING, CANCELLED }
PAYMENT_FAILED     → { FAILED, CANCELLED }
PENDING            → { ACCEPTED, REJECTED, CANCELLED }
ACCEPTED           → { PREPARING, CANCELLED, CANCEL_REQUESTED }
REJECTED           → { CANCELLED, FAILED }
PREPARING          → { READY, CANCELLED, EXCEPTION }
READY              → { DISPATCH_PENDING, CANCELLED }
DISPATCH_PENDING   → { DRIVER_OFFERED, DRIVER_ASSIGNED, CANCELLED, FAILED, EXCEPTION }
DRIVER_OFFERED     → { DRIVER_ASSIGNED, DISPATCH_PENDING, CANCELLED }
DRIVER_ASSIGNED    → { DRIVER_EN_ROUTE_PICKUP, DISPATCH_PENDING, CANCELLED, EXCEPTION }
DRIVER_EN_ROUTE_PICKUP → { PICKED_UP, CANCELLED, EXCEPTION }
PICKED_UP          → { DRIVER_EN_ROUTE_DROPOFF, DRIVER_EN_ROUTE_CUSTOMER, EXCEPTION }
DRIVER_EN_ROUTE_*  → { DELIVERED, EXCEPTION }
DELIVERED          → { COMPLETED }
COMPLETED          → { REFUND_PENDING, REFUNDED, PARTIALLY_REFUNDED }
CANCELLED          → { REFUNDED }
REFUND_PENDING     → { REFUNDED, PARTIALLY_REFUNDED }
CANCEL_REQUESTED   → { CANCELLED, ACCEPTED }
EXCEPTION          → { CANCELLED, FAILED }
```

Terminal: `COMPLETED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `FAILED`.

**Boundary conditions worth knowing:**
- `PICKED_UP` cannot be cancelled — only `EXCEPTION` or onward. Once the food is in the car, cancellation must go through the exception path.
- `EXCEPTION` can only resolve to `CANCELLED` or `FAILED` through the map. Returning an exception order to a live state requires `opsOverride`, which sits outside the map. **This is the deliberate escape hatch; it is audited but unconstrained.**
- `DELIVERED → COMPLETED` is the only outgoing edge from `DELIVERED`. There is no "delivered but disputed" state.

**Dual-status hazard:** `orders` carries both `engine_status` (canonical, 24 values) and `status` (legacy, 11 values), mapped by `ENGINE_TO_LEGACY_ORDER_STATUS`. The mapping is **lossy** — `READY`, `DISPATCH_PENDING`, `DRIVER_OFFERED` and `DRIVER_ASSIGNED` all collapse to `ready_for_pickup`; `EXCEPTION` and `CANCEL_REQUESTED` both collapse to `pending`. **Any query written against `status` cannot distinguish an order awaiting dispatch from one already assigned, nor a normal pending order from one in an exception.** Prefer `engine_status`.

### 2.2 Delivery and payout state machines

`DELIVERY_TRANSITION_MAP`: `UNASSIGNED → OFFERED → ACCEPTED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → PICKED_UP → EN_ROUTE_TO_CUSTOMER → ARRIVED_AT_CUSTOMER → DELIVERED`, with documented skip edges (`EN_ROUTE_TO_PICKUP → PICKED_UP`, `EN_ROUTE_TO_CUSTOMER → DELIVERED`) and `UNASSIGNED → ACCEPTED` for manual assignment. Terminal: `DELIVERED`, `FAILED`, `CANCELLED`.

`PAYOUT_TRANSITION_MAP`: `NOT_ELIGIBLE → ELIGIBLE → {PENDING, HELD} → PROCESSING → {PAID, FAILED}`, `FAILED → PENDING` (retry). Only `PAID` is terminal — **a failed payout is always retryable, and a paid one can never be reversed through the state machine.** Reversal must go through the refund path.

### 2.3 Pricing — VERIFIED, exact

| Rule | Value | Source |
|---|---|---|
| Service fee | **8%** of subtotal | `SERVICE_FEE_PERCENT`, overridable at runtime from `platform_settings.service_fee_percent` |
| Tax (HST) | **13%** | `HST_RATE`, overridable from `platform_settings.hst_rate` |
| Tax base | `subtotal + deliveryFee + serviceFee` | `computeServerQuote` |
| Delivery base | **$3.99** | `DELIVERY_BASE_FEE_CENTS` |
| Delivery per km | **$0.50/km**, surge applies to this portion only | `DELIVERY_PER_KM_CENTS` |
| Delivery cap | **$9.99**, applied **after** surge | `DELIVERY_MAX_FEE_CENTS` |
| Small-order surcharge | **+$2.00** when subtotal < **$15.00** | `SMALL_ORDER_*` |
| Distance | OSRM route metres when available, else Haversine × **1.3** road factor | `estimateDistance`, `ROAD_FACTOR` |
| Fallback delivery fee | **$5.00** (`BASE_DELIVERY_FEE`, marked `@deprecated`) when distance cannot be computed | `computeServerQuote` |
| Total | `subtotal + delivery + service + tax + tip − discount`, floored at 0 | `computeServerQuote` |

**⚠ Business-correctness flag, not a code defect.** Tax is computed on the **pre-discount** amount and the promo discount is then subtracted from the gross total:

```
tax   = (subtotal + deliveryFee + serviceFee) × 13%
total = max(subtotal + deliveryFee + serviceFee + tax + tip − promoDiscount, 0)
```

The customer therefore pays HST calculated on an amount larger than what they were actually charged. Whether that is correct depends on the legal character of the promotion (a retailer's own discount generally reduces the taxable consideration; a reimbursed third-party coupon generally does not). **This is an accounting and legal determination, not a code determination.** It is implemented consistently; it has not been verified as correct. Flagged as I-06 in the risk register.

**⚠ Fee inconsistency.** The distance-based path uses a $3.99 base; the no-distance fallback uses $5.00 from a constant explicitly marked `@deprecated`. A customer whose address fails to geocode is charged $1.01 more in base fee than one whose address succeeds.

### 2.4 Surge pricing — VERIFIED

`packages/engine/src/services/surge-pricing.service.ts`. Ratio = active demand ÷ available supply.

| Condition | Multiplier |
|---|---|
| ratio > 3 (`RATIO_PEAK`) | **2.0** (`SURGE_TIER_PEAK`) |
| ratio > 2 (`RATIO_VERY_BUSY`) | **1.5** |
| ratio > 1.5 (`RATIO_BUSY`) | **1.25** |
| otherwise | **1.0** |
| zero supply with active orders | **2.0** |
| hard cap | **`SURGE_CAP = 2.0`** |

Applied only to the distance portion of the delivery fee, before the $9.99 cap.

### 2.5 Driver assignment scoring — VERIFIED

`calculateDriverAssignmentScore(driver)`:

```
score = max(0, (12 − distance_km) × 10)   // distance dominates: 10 pts/km
      + (rating ?? 4) × 5                  // max +25
      + min(total_deliveries, 500) / 25    // max +20
      + fairness_score × 12
      − active_workload × 25               // one active job ≈ 2.5 km penalty
      − recent_declines × 8
      − recent_expiries × 10               // ignoring an offer costs more than declining it
```

**Eligibility gate before scoring:** `driver_presence.last_location_at` within **90 seconds** (`PRESENCE_TTL_SECONDS`), default search radius **10 km**, driver status `approved`. The code comments explain the TTL: the driver app posts location every 15 s while online, so a stale timestamp means a backgrounded or closed tab, and offering to a "ghost" driver leaves the order in `DISPATCH_PENDING` with nobody accepting.

**Then** `rankCandidates` re-orders the shortlist by **real OSRM ETA** where coordinates and the routing service are available; where they are not, the heuristic score stands alone.

**Deliberate design choice worth noting:** letting an offer expire (−10) is penalised *more* than declining it (−8). This pushes drivers toward an explicit answer, which shortens the dispatch loop.

### 2.6 Money split — VERIFIED

| Rule | Value |
|---|---|
| Platform commission | **15%** of order subtotal (`PLATFORM_FEE_PERCENT`) |
| Driver share | **80%** of the delivery fee (`DRIVER_PAYOUT_PERCENT`) |
| Chef share | remainder of subtotal after commission |
| Tip | recorded as a separate payable (`recordTipPayable`) |
| Currency | `cad` hard-coded at PaymentIntent creation |

**Duplicated implementation:** the identical arithmetic appears in `orchestrators/payout-engine.ts` (`calculateChefPayout`, `calculateDriverEarnings`) and in `orchestrators/commerce.engine.ts` (inline, at the ledger-write site). They share the same two constants and currently agree. A change to one without the other silently splits the platform's economics in two.

### 2.7 Ledger entries — VERIFIED

`LedgerService`, idempotency key `${entryType}:${sourceId}`, enforced by `uq_ledger_entries_idempotency_key`:

`recordCustomerCapture` · `recordOrderPayment` · `recordTipPayable` · `recordRefund` · `recordPayout` · `recordInstantPayoutFee` · `reverseInstantPayoutFee`

### 2.8 Loyalty — VERIFIED

| Tier | Lifetime points | Earn multiplier |
|---|---|---|
| bronze | 0 | ×1.0 |
| silver | 500 | ×1.25 |
| gold | 1,500 | ×1.5 |

Base earn: **1 point per $1 spent**, floored, then multiplied and floored again. Redemption: **1 point = $0.10** (`CENTS_PER_POINT = 10`). Awarded from the Stripe webhook on real (non-test) orders only.

### 2.9 Referrals — VERIFIED

`REFERRAL_REWARD_CENTS = 500` ($5.00). Capture works: `/auth/signup?ref=CODE` reads the parameter, upper-cases it, and POSTs `/api/referrals/apply` after signup (non-blocking — a bad code never fails the signup).

**Defect R-05:** the share link that is supposed to *produce* that traffic is built as `https://ridendine.com/signup?ref=CODE` — wrong TLD (production is `ridendine.ca`) **and** a path that does not exist (`/signup` vs `/auth/signup`). Both halves are wrong, so no shared link can ever work.

### 2.10 Risk evaluation — VERIFIED, and narrower than its name suggests

`evaluateCheckoutRisk` is a **pure function with no database access**. Its entire rule set:

| Check | Effect |
|---|---|
| `customerId` missing | **block** |
| `cartId` missing | **block** |
| amount not a positive finite integer | **block** |
| currency outside `['cad','usd']` | **block** |
| amount ≥ **$500.00** (`LARGE_ORDER_AMOUNT_CENTS = 50_000`) | **review** — not a block |
| `checkoutAttemptCount ≥ 5` | **review** — **but `runCheckout` never passes this field**, so it can never fire |

There is no velocity check, no device fingerprint, no card-history check, no chargeback history, no address-mismatch check. **In practice this component is input validation with a review flag, not fraud prevention.** It is honest code with a misleading name. Flagged as I-07.

### 2.11 SLA thresholds — VERIFIED

| Check | Threshold | Action | Runs where |
|---|---|---|---|
| `checkChefAcceptanceTimeout` | **5 min** | Auto-cancel the order | `processors/sla` |
| `checkDriverAssignmentTimeout` | **10 min** | Mark delivery escalated + `system_alerts` error | `processors/sla` |
| `checkStalePreparingOrders` | **45 min** | `system_alerts` warning | `processors/sla` |

**All three are gated behind R-01.** If the scheduler does not reach the processor, none of them ever fires.

### 2.12 Kitchen OS rules — VERIFIED

- **On-hand stock = the signed sum of `inventory_stock_movements`.** `inventory_items.current_quantity` is documented in code as a cache. `signedMovementQuantity` classifies movement types: `receive`/`return` add; `consume_order`/`consume_batch`/`waste` subtract; `adjustment`/`count_correction`/`transfer` carry a caller-supplied sign.
- `computeStockStatus` → `stockout` | `low` | `ok`; `computeReorderSuggestion`; `ordersRemaining(onHand, perOrderUsage)`.
- Alerts: `low_stock`, `stockout`, `expiring_soon`, `expired`.
- Production: `suggestedBatchCount(demand, yield)`, `batchYieldVariance(planned, actual)`, `netProducedQuantity(actual, waste)`.
- **No reconciliation job exists to detect drift between the cache column and the movement ledger.** Flagged as F-14.

### 2.13 Delivery zone — VERIFIED

Hard-coded to Hamilton, Ontario: centre `43.2557, −79.8711`, radius **25 km** (`DELIVERY_RADIUS_KM`). Geocoding results are memoised in a module-level `Map` that is never evicted and never bounded.

### 2.14 Partner test mode — VERIFIED

A layered design that is worth calling out as exemplary:

1. A partner key carries `test_mode` in `api_partner_keys`.
2. A test-mode key produces an order with `is_test = true`.
3. Checkout fails **closed** with 503 if the deployment has no `STRIPE_TEST_SECRET_KEY` — it never silently uses the live key.
4. The response carries `testMode` and the matching `publishableKey`, because a test `clientSecret` cannot be confirmed with a live publishable key.
5. Stripe customers are created per mode, because a live customer id on a test PaymentIntent fails with `resource_missing`.
6. The webhook verifies against the live secret, then the test secret; a test-signed event sets `isPartnerTestEvent`.
7. **Either** `orders.is_test` **or** `isPartnerTestEvent` is enough to keep the order out of the kitchen queue, finance, ledger, loyalty and payouts. Deliberately redundant.
8. `livemode` is explicitly *not* used to make this decision, because a staging deployment runs entirely on test keys and must still exercise the real finance paths.

---

## Part 3 — Failure and recovery workflow

Diagram source: [`diagrams/failure-and-recovery.mmd`](diagrams/failure-and-recovery.mmd)

| Failure | Detection | Automatic recovery | Manual recovery |
|---|---|---|---|
| Checkout fails after order creation | in-process `catch` | cancel order + release idempotency row | none needed |
| Checkout crashes mid-flight | next attempt sees a stale `processing` row | reclaim after **120 s** | none needed |
| Stripe webhook 5xx | Stripe retry | idempotency claim prevents double-processing | replay from the Stripe dashboard |
| `submitToKitchen` fails after payment | in-route | guarded direct advance to `pending` | ops override |
| Chef never accepts | `checkChefAcceptanceTimeout` @5 min | auto-cancel | **blocked by R-01** |
| No driver after 10 min | `checkDriverAssignmentTimeout` | escalate + alert | ops manual assign / force assign |
| Offer expires | `processExpiredOffers` | offer to next driver | ops force assign |
| Payout run crashes mid-way | `payout_runs.status = 'processing'` | partial unique index blocks a second concurrent run | operator must resolve the stuck row **by hand — no documented procedure** |
| Ledger ≠ Stripe | `ReconciliationService.runDaily` | **nothing — not scheduled (R-02)** | `POST /api/engine/reconciliation` |
| Inventory cache drifts from the movement ledger | **nothing** | **nothing** | manual count (`/api/inventory/counts`) |
