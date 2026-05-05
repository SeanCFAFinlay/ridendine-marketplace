# API foundation (Phase 4)

Canonical patterns for **Next.js Route Handlers** and shared server utilities. Aligns with [`docs/CROSS_APP_CONTRACTS.md`](CROSS_APP_CONTRACTS.md) and [`docs/AUTH_ROLE_MATRIX.md`](AUTH_ROLE_MATRIX.md).

---

## Route handler flow

1. **Parse** — `parseJsonBody` / Zod (`validateBody`) from `@ridendine/utils` where applicable.
2. **Auth** — Session via `@ridendine/db` + app `lib/engine` helpers (`getCustomerActorContext`, `getOpsActorContext`, etc.).
3. **Roles (ops-admin)** — `guardPlatformApi` / `finalizeOpsActor` from `@ridendine/engine` (see Phase 2); never trust client-supplied roles.
4. **Business** — Mutations through `@ridendine/engine` (`getEngine()`), not duplicated money/state logic in the route. **Risk (Phase 5):** before creating a PaymentIntent or placing an authoritative order, call **`RiskEngine.evaluateCheckoutRisk`** (or the narrower `evaluatePaymentRisk` / `evaluateCustomerRisk`) from `@ridendine/engine`; if `allowed` is false, return **4xx** with a generic message and log `auditPayload` server-side — **wire in checkout API in Phase 6+** (see [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md)).
5. **Respond** — `successResponse` / `errorResponse` (apps) or `apiSuccess` / `apiError` (`@ridendine/utils`).

---

## Stripe (IRR-007 / IRR-018)

| Rule | Detail |
|------|--------|
| **Single client** | `getStripeClient()` from `@ridendine/engine` (`packages/engine/src/services/stripe.service.ts`). |
| **Version** | `STRIPE_API_VERSION` — one constant for the monorepo. |
| **Secret** | `STRIPE_SECRET_KEY` server env only; `assertStripeConfigured()` throws if missing. |
| **Connect** | Same client instance supports Connect APIs used by chef payout routes. |

Call sites migrated in Phase 4: web checkout + Stripe webhook, chef payout setup/request, ops refund + engine payouts, web `stripePaymentAdapter`.

**Webhook idempotency (IRR-008, Phase 9):** `POST /api/webhooks/stripe` claims each `event.id` in **`stripe_events_processed`** before side effects; replays return **200** with `idempotentReplay`. See [`docs/PAYMENT_LEDGER_FLOW.md`](PAYMENT_LEDGER_FLOW.md).

---

## JSON error envelope (`@ridendine/utils`)

Base builders in `packages/utils/src/api.ts`: `apiSuccess`, `apiError`, `api401`, `api403`, `api404`, `api500`, `validateBody`, `parseJsonBody`, `handleRouteError`.

Phase 4 aliases in `packages/utils/src/api-response.ts`: `ok`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `serverError`, `validationError`, `methodNotAllowed`.

**401 vs 403:** unauthenticated → 401 (`UNAUTHORIZED`); authenticated but not allowed → 403 (`FORBIDDEN`) — see `AUTH_ROLE_MATRIX.md`.

---

## Health checks (IRR-036)

All apps expose `GET /api/health` returning `apiSuccess(healthPayload('<app>'))`.

**`data` shape:** `ok`, `service`, `timestamp`, `version`, `environment`, `checks: { app: 'ok' }`, optional `uptimeSeconds` (compat).

No DB probes or secrets in the default handler.

---

## Cron / processor routes

Use shared processor token validation (existing per-route pattern). Do not use customer session for privileged processors.

---

## Ledger / audit / order history (forward rules)

| Action | Rule |
|--------|------|
| **Money** | Charge/capture/refund/fee adjustments must hit **`ledger_entries`** (or documented exception) — enforced in later payment phases. |
| **Admin overrides** | Write **`audit_logs`** / **`ops_override_logs`** / **`domain_events`** per engine patterns. |
| **Order state** | Persist **`order_status_history`** and emit **`domain_events`** as designed. |
| **UI** | No authoritative business rules in client UI — API + engine own truth. |

---

*Phase 4 — API foundation. Next phase: Phase 5 only.*
