# 06 — Connection Register

Every material connection between components or to an external system. IDs `NET-nnn` are stable and reused in all diagrams.

Legend: **Sync** = caller blocks · **Async** = fire-and-forget or queued · **Callback** = external system initiates.

---

## A. Human → application

| ID | From | To | Trigger | Interface | Data | Auth | Failure behaviour | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| NET-001 | Customer browser | C-01 `apps/web` | Navigation / fetch | HTTPS, RSC + JSON | Pages, cart, order data | Supabase session cookie; `middleware.ts` protects `/account`, `/checkout` only | 307 to `/auth/login`; maintenance → `/maintenance` | `apps/web/src/middleware.ts: protectedRoutes` | VERIFIED |
| NET-002 | Chef browser | C-05 `apps/chef-admin` | Navigation / fetch | HTTPS | Storefront, menu, orders, kitchen data | Session; **default-protect on** (everything except an explicit public list) | 307 to `/auth/login` | `apps/chef-admin/src/middleware.ts` | VERIFIED |
| NET-003 | Driver browser/PWA | C-10 `apps/driver-app` | Navigation / fetch / SW | HTTPS | Offers, deliveries, earnings | Session; default-protect on; matcher excludes PWA assets | 307 to `/auth/login` | `apps/driver-app/src/middleware.ts: config.matcher` | VERIFIED |
| NET-004 | Ops browser | C-07 `apps/ops-admin` | Navigation / fetch | HTTPS | Everything | Session **+** `platform_users` membership in `/dashboard` layout **+** per-route capability | Redirect or 401/403 | `apps/ops-admin/src/app/dashboard/layout.tsx` | VERIFIED |

## B. Machine → application

| ID | From | To | Trigger | Interface | Data | Auth | Failure behaviour | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| NET-005 | Partner server | C-02 Partner API | Partner order | HTTPS JSON | Inline customer, address, items | `x-api-key`/`Bearer` → SHA-256 → `api_partner_keys`; optional HMAC + timestamp; scope check | 401 `UNAUTHORIZED`, 403 `FORBIDDEN_SCOPE`, 401 `SIGNATURE_INVALID`, 429 | `apps/web/src/lib/partner/{auth,signing,rate-limit}.ts` | VERIFIED |
| NET-014 | Stripe | C-04 web webhook | `payment_intent.*`, `charge.refunded` | HTTPS **callback** | Event JSON + `stripe-signature` | HMAC over raw body; live secret then test secret | 400 invalid signature; 409 claim failure; 500 → **Stripe retries** | `apps/web/src/app/api/webhooks/stripe/route.ts: constructWebhookEvent` | VERIFIED |
| NET-015 | Stripe | C-09 ops webhook | `transfer.created`, `payout.paid`, `payout.failed` | HTTPS **callback** | Event JSON | HMAC with `STRIPE_WEBHOOK_SECRET_OPS` → fallback `STRIPE_WEBHOOK_SECRET` | Non-finance types return `ignored:true` **before** claiming; 500 → retry | `apps/ops-admin/src/app/api/stripe/webhook/route.ts: FINANCE_TYPES` | VERIFIED |
| NET-020 | Vercel Cron | C-08 processors | `0 2 * * *`, `0 3 * * *`, `* * * * *` | HTTPS **GET** | none | `Authorization: Bearer $CRON_SECRET` | **Work is in `POST`; `GET` returns `{status:'ready'}` and performs nothing.** | `apps/ops-admin/vercel.json` vs the three `route.ts` | **CONTRADICTED — see R-01** |
| NET-021 | C-08 partner-webhooks | Partner server | Order lifecycle event | HTTPS **outbound**, HMAC-signed | Event payload | Per-partner signing secret | Retry with backoff (in `runPartnerWebhookProcessor`); blocked entirely by R-01 | `apps/ops-admin/src/lib/partner-webhooks.ts` | INFERRED 0.85 |

## C. Application → engine

| ID | From | To | Trigger | Interface | Data | Notes | Evidence | Status |
|---|---|---|---|---|---|---|---|---|
| NET-030 | All 4 apps | C-11…C-16 engine | Every privileged route | **In-process** `getAdminEngine()` → `createCentralEngine(adminClient)` | Full engine object graph | **Constructed per request**, on the service-role client | `packages/engine/src/client-helpers.ts: getAdminEngine` | VERIFIED |
| NET-031 | C-01 route | C-03 `runCheckout` | `POST /api/checkout` | In-process function call | `(request, actor, customerId, input)` | Rate limit `checkout` 3/60 s composite, fail-closed, applied in the route | `apps/web/src/app/api/checkout/route.ts` | VERIFIED |
| NET-032 | C-02 route | C-03 `runCheckout` | `POST /api/partner/checkout` | In-process function call | Same shape + `partnerId`, `isTest`, `actor = system` | Rate limit `partnerCheckout` 60/60 s | `apps/web/src/app/api/partner/checkout/route.ts` | VERIFIED |
| NET-033 | C-04 webhook | C-11 order creation | `payment_intent.succeeded` | In-process | `authorizePayment(orderId, piId, systemActor)` → `submitToKitchen` | Amount checked to the cent first; test orders skip this entirely | `apps/web/src/app/api/webhooks/stripe/route.ts` | VERIFIED |
| NET-034 | C-05 chef route | C-11 | Chef marks ready | In-process | `markReadyForPickup` → `DispatchOrchestrator.onOrderReadyForPickup` | **This is where a delivery row first comes into existence** | `dispatch-orchestrator.ts: onOrderReadyForPickup`; comment in `run-checkout.ts` | VERIFIED |

## D. Engine → data & external

| ID | From | To | Trigger | Interface | Data | Auth | Failure behaviour | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| NET-040 | Engine / routes | C-20 Supabase | Every operation | PostgREST over HTTPS | All tables | **Service-role key — RLS bypassed** | Errors surface as typed `errorResponse` | `packages/db/src/client/admin.ts: createAdminClient` | VERIFIED |
| NET-041 | Browser components | C-20 Supabase | Client-side reads / realtime | PostgREST + WebSocket | Scoped rows | **Anon key — RLS enforced** | Empty result | `packages/db/src/client/browser.ts`; `packages/db/src/realtime/channels.ts` | VERIFIED |
| NET-042 | Server components | C-20 Supabase | SSR page data | PostgREST, cookie-bound | Rows visible to the signed-in user | **User JWT — RLS enforced** | Empty result | `packages/db/src/client/server.ts`; used in `apps/ops-admin/src/app/dashboard/page.tsx` | VERIFIED |
| NET-043 | C-03 | Stripe | Checkout | `stripe.paymentIntents.create` | amount, currency `cad`, metadata (`order_id`, `order_number`, `customer_id`, `storefront_id`, `cart_id`, optional `partner_id`, `is_test`) | Secret key | Stripe idempotency key `checkout:{customerId}:{key}`; failure → order cancelled + row marked failed | `run-checkout.ts` | VERIFIED |
| NET-044 | C-14 | Stripe | Refund / payout | Stripe SDK | Refunds, transfers, payouts | Secret key | `stripe-retry.ts` wrapper | `services/{stripe,payout,commerce}` | VERIFIED |
| NET-045 | C-05 | Stripe Connect | Chef onboarding | Account links | Return/refresh URLs from `NEXT_PUBLIC_CHEF_ADMIN_URL` | Secret key | 4xx surfaced to the chef | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | VERIFIED |
| NET-046 | C-10 | Stripe | Driver instant payout | Stripe SDK | Payout + fee | Secret key | Fee reversal path exists (`reverseInstantPayoutFee`) | `apps/driver-app/src/app/api/payouts/instant/route.ts` | VERIFIED |
| NET-047 | C-19 | `router.project-osrm.org` | ETA / driver ranking | HTTPS GET | Coordinates → duration + polyline | **None** | 12 s timeout, 2 retries, then `OsrmRoutingError`; ranking degrades to score-only | `packages/routing/src/osrm.provider.ts: DEFAULT_BASE, DEFAULT_TIMEOUT_MS, DEFAULT_RETRIES` | VERIFIED |
| NET-048 | Engine | `nominatim.openstreetmap.org` | Address geocode | HTTPS GET, custom `User-Agent` | Address string → lat/lng | **None** | **No timeout set.** Non-OK → cached `null` | `packages/engine/src/services/geocoding.service.ts` | VERIFIED |
| NET-049 | C-15 | Resend | Email | HTTPS API | Templated email | `RESEND_API_KEY` | Provider inert when key absent → DB notification only | `packages/engine/src/core/email-provider.ts` | VERIFIED |
| NET-050 | C-15 | `api.twilio.com` | SMS | HTTPS API | Templated SMS | `TWILIO_ACCOUNT_SID`/`AUTH_TOKEN` | Provider inert when unset | `packages/engine/src/core/sms-provider.ts` | VERIFIED |
| NET-051 | Rate limiter | Upstash Redis | Every limited route | REST | Counter keys | `UPSTASH_REDIS_REST_TOKEN` | **Falls back to per-instance memory and flags `degraded`** | `packages/utils/src/rate-limit/index.ts` | VERIFIED |
| NET-052 | Apps | Supabase Storage | Image upload | Storage API | Images ≤5 MB, MIME allowlist, path `{userId}/{ts}-{rand}.{ext}` | Service role | Auto-creates the `profiles` bucket on "not found" and retries once | `apps/web/src/app/api/upload/route.ts` | VERIFIED |

## E. Cross-app connections

| ID | From | To | Mechanism | Notes | Status |
|---|---|---|---|---|---|
| NET-060 | Any app | Any app | **Shared database only** | No app imports another; no internal HTTP between apps. Verified in all four `package.json` dependency lists. | VERIFIED |
| NET-061 | C-01 | C-05 | Hyperlink | `getChefPortalSignupUrl()` / `getChefPortalLoginUrl()` from `NEXT_PUBLIC_CHEF_ADMIN_URL` | VERIFIED |
| NET-062 | C-05 / C-10 | C-01 | Hyperlink | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DRIVER_APP_URL` | VERIFIED |
| NET-063 | C-01 browser | C-20 realtime | WebSocket | `use-order-stream`, `notification-bell` | VERIFIED |
| NET-064 | C-05 browser | C-20 realtime | WebSocket | `use-storefront-orders-realtime` | VERIFIED |
| NET-065 | C-10 browser | C-20 realtime | WebSocket | `offer-alert` | VERIFIED |
| NET-066 | C-07 browser | C-20 realtime | WebSocket | `use-ops-live-feed`, `live-map`, `ops-alerts`, `real-time-stats` | VERIFIED |

---

## Rate-limit policy matrix

Every policy that governs a connection above (`packages/utils/src/rate-limit/policies.ts`) — VERIFIED verbatim:

| Policy | Limit | Window | Key | On limiter failure | Risk |
|---|---|---|---|---|---|
| `auth` | 5 | 60 s | ip | **fail closed** | high |
| `checkout` | 3 | 60 s | composite | **fail closed** | high |
| `partnerCheckout` | 60 | 60 s | composite | **fail closed** | high |
| `customerWrite` | 30 | 60 s | user_id | fail closed | high |
| `chefWrite` | 30 | 60 s | user_id | fail closed | high |
| `opsAdminMutation` | 20 | 60 s | user_id | fail closed | high |
| `supportWrite` | 10 | 60 s | ip | fail closed | high |
| `upload` | 10 | 60 s | ip | fail closed | high |
| `webhookStripe` | 200 | 60 s | composite | **fail open** | medium |
| `driverLocation` | 24 | 60 s | driver_id | **fail open** | medium |
| `publicRead` | 120 | 60 s | ip | **fail open** | low |

`driverLocation` at 24/min against a client that posts every 15 s (4/min) leaves generous headroom. `webhookStripe` and `publicRead` fail **open** deliberately: rejecting a Stripe event would be worse than admitting it, since the event is de-duplicated downstream anyway.

---

## Why the critical links exist, and what breaks

| Link | Why it exists | What breaks if it fails |
|---|---|---|
| **NET-014** Stripe → web webhook | The browser cannot be trusted to report payment | **Paid orders never reach the kitchen.** Customers charged, nothing cooked. Highest-consequence arrow in the system. |
| **NET-040** everything → Supabase | Single store of record | **Total platform outage.** No fallback exists anywhere. |
| **NET-020** Vercel Cron → processors | The only scheduler | SLA enforcement, timeout auto-cancel, offer expiry, partner webhooks. **Evidence says this link is already dead.** |
| **NET-034** chef ready → dispatch | Deliveries are created at "ready", not at payment — deliberately, so unpaid orders never generate dispatch work | Ready orders never get a driver; food goes cold in the kitchen. |
| **NET-047** engine → OSRM | Real driving times for ranking and ETA | Ranking degrades to a scoring heuristic; ETAs become straight-line estimates. Graceful, but this is a free third-party service carrying production traffic. |
| **NET-043** checkout → Stripe | Ridendine holds no card data | No new orders can be paid for. In-flight orders continue. |
| **NET-005** partner → web | Partner revenue channel | Partner orders stop; the marketplace is unaffected. |
