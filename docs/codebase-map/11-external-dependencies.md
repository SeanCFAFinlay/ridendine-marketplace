# 11 — External Systems and Dependencies

---

## 1. External services

Classified along the axes the analysis requires: declared vs imported vs invoked, optional vs required, build-time vs runtime, active vs legacy.

| # | Service | Declared | Imported | **Invoked** | Required | Phase | Status |
|---|---|---|---|---|---|---|---|
| X-01 | **Supabase** (Postgres, Auth, Storage, Realtime) | ✅ `@supabase/supabase-js`, `@supabase/ssr` | ✅ | ✅ every request | **Hard** | runtime | ACTIVE |
| X-02 | **Stripe** | ✅ `stripe@20.4`, `@stripe/{react-,}stripe-js` | ✅ | ✅ checkout, webhooks, Connect, payouts, refunds | **Hard for revenue** | runtime + client | ACTIVE |
| X-03 | **Vercel** | ✅ 4 × `vercel.json`, `@vercel/analytics`, `@vercel/speed-insights` | ✅ | ✅ hosting, build, cron | **Hard** | build + runtime | ACTIVE |
| X-04 | **OSRM public demo** `router.project-osrm.org` | ❌ no package — raw `fetch` | ✅ `OsrmProvider` | ✅ ETA + driver ranking | Soft | runtime | ACTIVE, **unkeyed** |
| X-05 | **Nominatim public** `nominatim.openstreetmap.org` | ❌ no package — raw `fetch` | ✅ | ✅ geocoding + zone validation | Soft | runtime | ACTIVE, **unkeyed** |
| X-06 | **Resend** (email) | ✅ `resend@4` in engine | ✅ `createResendProvider` | ⚠️ **only when `RESEND_API_KEY` is set** | Optional | runtime | CONDITIONAL |
| X-07 | **Twilio** (SMS) | ❌ no package — raw `fetch` to `api.twilio.com` | ✅ `createTwilioProvider` | ⚠️ only when `TWILIO_*` set | Optional | runtime | CONDITIONAL |
| X-08 | **Upstash Redis** | ❌ no package — REST | ✅ `DistributedRateLimitStore` | ⚠️ only when `UPSTASH_*` set | Optional | runtime | CONDITIONAL |
| X-09 | **Sentry** | ✅ `@sentry/nextjs@9.47.1` in all 4 apps | ⚠️ only by the four `sentry.*.config.ts` files | ❌ **never — not wired** | — | — | **INACTIVE** |
| X-10 | **cdnjs.cloudflare.com** | ❌ | — | ✅ 6 Leaflet marker/CSS URLs in the driver map | Soft | client runtime | ACTIVE |
| X-11 | **GitHub Actions** | ✅ 4 workflows | — | ✅ | Hard for CI | build | ACTIVE |
| X-12 | **Mapbox** | ❌ | ✅ `MapboxProvider` exported | ❌ never instantiated | — | — | **INACTIVE** |
| X-13 | **Google Maps** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` documented in `.env.example` | ❌ | ❌ | — | — | **INACTIVE — documented but unused** |

## 2. Active service detail

### X-01 Supabase — the single point of failure

| | |
|---|---|
| **Why** | One canonical relational store, plus auth, storage and realtime, without operating four separate systems. |
| **Integration** | `packages/db/src/client/{browser,server,admin}.ts` |
| **Data sent** | Everything — customer PII, addresses, orders, driver location history, kitchen data, ledger entries |
| **Credentials** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public, RLS-enforced) and `SUPABASE_SERVICE_ROLE_KEY` (**server-only, bypasses RLS**). `admin.ts` throws if it detects a browser. |
| **Permissions** | Service role = full database. Every API route runs with it. |
| **Availability dependency** | **Absolute.** No retry, no circuit breaker, no fallback, no degraded read path anywhere in the code. |
| **Timeout / retry** | None configured on the Supabase client. Only the middleware's maintenance lookup sets a timeout (1.5 s) — and that one fails open. |
| **Data residency** | Region UNKNOWN from the repository. The on-disk `DATABASE_URL` points at an `aws-1-us-east-1` pooler, which would mean **Canadian customer PII stored in the United States** — worth a compliance decision, and confirmable only from the Supabase console. |
| **Replacement difficulty** | **Extreme.** RLS policies, Auth, Realtime, Storage and PostgREST semantics are all assumed throughout. |
| **Cost driver** | Compute size, storage, egress, realtime connections, auth MAU. Pricing not verified. |

### X-02 Stripe

| | |
|---|---|
| **Why** | Ridendine holds no card data and is not a money transmitter. |
| **Integration** | `packages/engine/src/services/stripe.service.ts` (client factory), `run-checkout.ts` (PaymentIntent), `commerce.engine.ts` (refunds), `payout.service.ts` (transfers/payouts), `chef-admin/api/payouts/setup` (Connect), `driver-app/api/payouts/instant` |
| **Data sent** | Amount, `cad`, and metadata: `order_id`, `order_number`, `customer_id`, `storefront_id`, `cart_id`, `order_total_cents`, optional `promo_code_id`, `partner_id`, `is_test`. Plus customer email and name via `getOrCreateStripeCustomer`. |
| **Data received** | PaymentIntent, `client_secret`, webhook events |
| **Credentials** | `STRIPE_SECRET_KEY`; optional `STRIPE_TEST_SECRET_KEY`. Webhook secrets: `STRIPE_WEBHOOK_SECRET`, `_OPS`, `_TEST`. `STRIPE_ALLOW_TEST_IN_PRODUCTION` deliberately gates using an `sk_test_` key while `NODE_ENV=production` (staging only). |
| **Availability dependency** | Hard for new revenue; in-flight orders continue to be cooked and delivered. |
| **Timeout / retry** | `packages/utils/src/stripe-retry.ts`; Stripe idempotency key `checkout:{customerId}:{key}` on PaymentIntent creation. Inbound: Stripe retries on 5xx, de-duplicated by `stripe_events_processed`. |
| **Compliance** | PCI scope minimised — card data goes browser → Stripe directly. |
| **Replacement difficulty** | High: two webhook handlers, Connect onboarding, transfers, instant payouts, refunds and the whole test-mode design are Stripe-shaped. |
| **Cost driver** | Per-transaction fees, Connect account fees, instant-payout fees (there is an explicit `recordInstantPayoutFee` ledger entry type). Pricing not verified. |

### X-04 OSRM public demo server — the notable risk

| | |
|---|---|
| **Why** | Real driving durations for driver ranking and customer ETAs, without paying for a routing API. |
| **Integration** | `packages/routing/src/osrm.provider.ts: DEFAULT_BASE = 'https://router.project-osrm.org'`; instantiated in exactly two places, both with **no `baseUrl` override**. |
| **Data sent** | Pickup and drop-off coordinates — i.e. **customer delivery addresses, as coordinates, to a third-party public server**. |
| **Credentials** | **None. No account, no key, no contract, no SLA, no support path.** |
| **Timeout / retry** | 12 s, 2 retries — implemented well. |
| **Fallback** | Ranking degrades to the heuristic score; distance falls back to Haversine × 1.3. Graceful. |
| **Risk** | `router.project-osrm.org` is the OSRM project's **demo server**, published with a fair-use policy aimed at development and evaluation. Production dispatch traffic on it is fragile — rate-limiting, blocking, or removal would be silent from Ridendine's side and would degrade driver assignment quality without any alert (there is no alerting — R-03). |
| **Mitigation already half-built** | `OsrmProviderOptions.baseUrl` accepts a self-hosted OSRM URL, and `MapboxProvider` implements the same interface. Neither is used. **Switching to a self-hosted OSRM is a one-line change at each of the two instantiation sites.** |

### X-05 Nominatim public

Same shape as X-04. `NOMINATIM_BASE_URL` with a custom `User-Agent` (`Ridendine/1.0 … contact@ridendine.com`) — the correct courtesy, and evidence the author knew about the usage policy. **No timeout is set on the fetch**, and results are memoised in an unbounded module-level `Map`. OSM's Nominatim usage policy limits automated use to roughly 1 request/second and prohibits heavy use; production address validation on it is fragile for the same reasons as X-04.

### X-06 / X-07 Resend and Twilio

Both registered unconditionally in `createCentralEngine` and both **inert without credentials** — they simply do nothing, and notifications fall back to database rows shown in-app. This is a clean degradation. The risk is silence: there is no signal that outbound messaging is off.

### X-08 Upstash Redis

When absent, `getRateLimitStore()` returns the in-memory store and `evaluateRateLimit` marks the result `degraded` with a `console.warn`. **On Vercel this means the limit is per-lambda-instance, not per-platform** — a distributed attacker sees a much higher effective limit than the policy states. Given no alerting exists, the `degraded` flag would go unnoticed.

### X-09 Sentry — declared but never initialised

**VERIFIED, and this is a top-five finding.**

| Evidence | Result |
|---|---|
| `@sentry/nextjs` in all 4 `package.json` | present, resolved to **9.47.1** |
| `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` | present in all 4 apps, each guarded by `if (process.env.NEXT_PUBLIC_SENTRY_DSN)` |
| `withSentryConfig` in any `next.config.js` | **absent from all four** |
| `instrumentation.ts` anywhere | **absent** |
| `import … from '@sentry/nextjs'` under `apps/*/src` | **0 occurrences** |
| Sentry code in the built `apps/web/.next` output | **none** — the only `sentry` string is `*.sentry.io` inside the CSP `connect-src` |

With `@sentry/nextjs` v8+ on Next 14, the client config is loaded by the `withSentryConfig` webpack plugin and the server/edge configs are registered through `instrumentation.ts`. Neither mechanism is present. **The four config files are dead code and no error is ever reported.**

## 3. NPM dependency posture

| Signal | Finding |
|---|---|
| Lockfile | `pnpm-lock.yaml` committed, `--frozen-lockfile` in CI and in all four `vercel.json` install commands |
| Version pinning | Caret ranges (`^`) throughout — patch and minor drift is possible between installs, bounded by the lockfile |
| Exact pin | `prettier-plugin-tailwindcss: 0.8.0` is the only exact pin |
| Runtime deps in apps | Deliberately small: Next, React, Supabase, Stripe, Leaflet, lucide-react, Sentry, Zod (web only) |
| Vulnerability scanning | **None.** No Dependabot config, no Renovate config, no `pnpm audit` step in any workflow, no CodeQL, no SCA. |
| Supply-chain hardening | `--frozen-lockfile` ✅ · pinned pnpm 9.15.0 ✅ · GitHub Actions pinned to major tags (`@v4`) not SHAs ⚠️ · `permissions: contents: read` on workflows ✅ |
| Transitive risk | UNKNOWN — no advisory source was consulted for this analysis, by configuration. |

**Recommendation (S-05 in the risk register):** add Dependabot or Renovate plus a `pnpm audit --audit-level=high` gate. The absence of any dependency scanning in a repository that handles payments is the most notable supply-chain gap.

## 4. Failure-mode summary by dependency

| Service | Detection | Automatic behaviour | Manual recovery |
|---|---|---|---|
| Supabase | 500s everywhere; `/api/health` reports `down` | **None** | Supabase status page; wait |
| Stripe API | Checkout returns `PAYMENT_FAILED`/`PAYMENT_CONFIG_ERROR` | `stripe-retry` wrapper | Retry; Stripe status page |
| Stripe webhook | Order stuck in `checkout_pending` / `payment_authorized` | Stripe retries on 5xx | Replay the event from the Stripe dashboard |
| OSRM | Silent | Heuristic ranking + Haversine distance | Set a self-hosted `baseUrl` |
| Nominatim | Silent, returns `null` | Address validation fails | Manual coordinate entry |
| Resend / Twilio | Silent | DB notifications only | Set the credentials |
| Upstash | `degraded` flag in the response + a `console.warn` | Per-instance memory limiter | Set the credentials |
| Vercel | Total outage | None | Vercel status page |
| Sentry | — | **Nothing is reported at all** | Wire it up (R-03) |

## 5. Cost implications

Every service above is a cost driver. **No vendor pricing was verified from an authorized current source during this analysis, so no figures appear anywhere in this package.** See `19-cost-driver-map.md` for what drives spend and where to measure it.
