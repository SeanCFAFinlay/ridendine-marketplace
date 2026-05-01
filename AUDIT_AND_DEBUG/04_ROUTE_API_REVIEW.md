# Phase 5 — Route and API review

## Method

1. Globbed **`apps/**/route.ts`** — **77** route handler files.  
2. Cross-checked with **`pnpm run build`** output (Next.js route manifest) — **all four apps compiled**.

“Works?” below means **build-time / import resolution succeeded**. Runtime behavior against production Supabase/Stripe requires deployed env and was not fully exercised in this audit unless noted in `12_VALIDATION_REPORT.md`.

## Summary by application

### `apps/web` (customer)

Representative API routes (non-exhaustive; see glob): `/api/health`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/orders`, `/api/orders/[id]`, `/api/webhooks/stripe`, `/api/profile`, `/api/favorites`, `/api/reviews`, `/api/support`, `/api/upload`, `/api/notifications`, `/api/addresses`, etc.

| Concern | Notes |
|---------|--------|
| Stripe | Checkout + webhook present |
| Health | Aggregates config flags including Supabase + Stripe + migration flag |

### `apps/chef-admin`

Routes include `/api/menu`, `/api/menu/[id]`, `/api/orders`, `/api/orders/[id]`, `/api/storefront`, `/api/upload`, `/api/payouts/setup`, `/api/payouts/request`, `/api/profile`, `/api/health`, `/api/auth/signup`.

| Route area | Works? (compile) | Issue | Fix needed |
|------------|------------------|-------|------------|
| Payouts setup | Yes | **Stripe Connect `refresh_url` / `return_url` used `NEXT_PUBLIC_APP_URL`** (defaults to customer origin per `.env.example`) — wrong host for chef dashboard when unset | Use chef-admin public base URL — **see `09_ROOT_CAUSE_REPORT.md`** |

### `apps/ops-admin`

Large `/api/engine/*` surface (dashboard, dispatch, exceptions, processors, settings, payouts, refunds, etc.) plus `/api/orders`, `/api/deliveries`, `/api/drivers`, `/api/chefs`, `/api/customers`, `/api/support`, `/api/health`, `/api/export`, etc.

### `apps/driver-app`

`/api/deliveries`, `/api/deliveries/[id]`, `/api/driver`, `/api/driver/presence`, `/api/offers`, `/api/earnings`, `/api/location`, `/api/auth/*`, `/api/health`.

## Master route table (abbreviated)

Because listing all 77 routes individually would duplicate build output, the authoritative compile-time map is the **`pnpm run build`** stdout for each app (Next.js “Route (app)” tables). Snapshot date: 2026-05-01 — **exit code 0**.

| Category | Count / status |
|----------|----------------|
| Total `route.ts` files under `apps/` | 77 |
| Broken imports (build) | 0 observed |
| Missing handlers (build) | 0 observed |

## Client ↔ API wiring

- Full UI→API matrix would require page-by-page tracing; **no systematic broken import** was found during build.
- Known gap: **chef Stripe Connect URLs** — configuration bug, not a missing file.

## Placeholder / fake responses

- Tests use mocked Stripe keys (e.g. `apps/web/src/__tests__/stripe-adapter.test.ts`) — labeled test fixtures, not production paths.
