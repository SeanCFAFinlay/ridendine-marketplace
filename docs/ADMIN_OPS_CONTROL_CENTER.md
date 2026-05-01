# Admin operations control center (Phase 10)

**App:** `apps/ops-admin` — the **only** browser control surface for platform staff (customers, chefs, and drivers use their respective apps).

**Auth:** Session via Supabase; staff identity and permission come from **`platform_users`** (`role`, active row). The engine exposes `getOpsActorContext()` and **`guardPlatformApi(actor, capability)`** (`packages/engine/src/services/platform-api-guards.ts`). **UI gating is additive only** — every sensitive API route must call `guardPlatformApi` (or equivalent) and return **401** when unauthenticated, **403** when the role lacks the capability.

---

## Canonical sources of truth

| Domain | Source of truth | Admin access pattern |
|--------|-----------------|----------------------|
| Permissions | `platform_users.role` (+ engine `ActorRole`) | `guardPlatformApi` / `hasPlatformApiCapability` |
| Audit | `audit_logs`, `ops_override_logs`, `domain_events` (where populated) | `GET /api/audit/recent`, order detail timeline when `audit_timeline_read` |
| Orders | `orders`, `order_items`, `order_status_history` / events view | `GET /api/orders`, `GET/ PATCH /api/engine/orders/[id]` |
| Deliveries / drivers | `deliveries`, driver assignment columns | `GET/PATCH` deliveries APIs, dashboard deliveries |
| Finance | **`ledger_entries`** (authoritative), Stripe for money movement | Engine `ops.getFinanceOperations`, `POST .../refund`, exports — **no Stripe from browser** |
| System rules | `platform_settings` (via engine rules) | `GET/POST /api/engine/settings` — **`platform_settings` capability: `super_admin` only** |

---

## Role → capability summary

Authoritative matrix: **`platform-api-guards.ts`** (`CAPABILITY_ROLES`). Highlights:

| Role (examples) | Typical capabilities |
|-----------------|----------------------|
| **super_admin** | All, including `platform_settings`, finance, audit, governance |
| **ops_admin** / **ops_manager** | Orders read/write, dispatch, overrides (`order_override`), chefs/drivers governance, audit timeline, exceptions |
| **ops_agent** | Orders read/write (not `order_override`), dispatch, deliveries read/write, no finance-only exports |
| **finance_manager** / **finance_admin** | Finance refunds, payouts, engine finance, **`finance_export_ledger`** — **not** `ops_orders_read` (ops queue is ops-only) |
| **support_agent** | **`ops_orders_read`** (triage), **`support_queue`**, **`engine_health`** — **not** `ops_orders_write`, **`order_override`**, **`audit_timeline_read`**, finance-sensitive |

---

## Dashboard routes (UI)

| Path | Purpose |
|------|---------|
| `/dashboard` | Overview |
| `/dashboard/orders`, `/dashboard/orders/[id]` | Live order board + detail |
| `/dashboard/deliveries`, `/dashboard/deliveries/[id]` | Deliveries |
| `/dashboard/finance` | Finance summary + actions (role-gated server page) |
| `/dashboard/chefs`, `/dashboard/chefs/[id]`, `/dashboard/chefs/approvals` | Vendor directory + approvals |
| `/dashboard/drivers`, `/dashboard/drivers/[id]` | Drivers |
| `/dashboard/customers`, `/dashboard/customers/[id]` | Customers |
| `/dashboard/support` | Support tickets |
| `/dashboard/activity` | Recent `audit_logs` / override logs (server-gated by `audit_timeline_read`) |
| `/dashboard/settings` | Platform settings UI (must align with `platform_settings` API) |
| `/dashboard/analytics`, `/dashboard/team`, `/dashboard/promos`, … | As implemented |

---

## API endpoints (representative)

| Area | Route | Capability (primary) |
|------|-------|------------------------|
| Orders list | `GET /api/orders` | `ops_orders_read` |
| Order detail / actions | `GET/PATCH /api/engine/orders/[id]` | read: `ops_orders_read`; PATCH: `ops_orders_write`; `action: 'override'` also requires `order_override` |
| Refund | `POST /api/orders/[id]/refund` | `finance_refunds_sensitive` (uses **`getStripeClient()`** server-side) |
| Finance engine | `GET/POST /api/engine/finance` | finance capabilities |
| Payouts | `/api/engine/payouts` | `finance_payouts` |
| Exports | `GET /api/export` | `finance_export_ledger` / `ops_export_operational` (e.g. `stripe_events` for reconciliation) |
| Audit JSON | `GET /api/audit/recent` | `audit_timeline_read` |
| Settings | `GET/POST /api/engine/settings` | `platform_settings` |
| Chefs / drivers / customers / deliveries / dispatch / exceptions / support | Under `src/app/api/**` | Each wired to a capability in route handlers |

Stripe **must** be invoked only from server routes / engine services, never from React client code.

---

## Order control

- **List / filter:** Orders board consumes **`GET /api/orders`** (real data). Client must respect API shape `{ success, data: { items, ... } }`.
- **Transitions:** `PATCH /api/engine/orders/[id]` delegates to **`@ridendine/engine`** order methods (`acceptOrder`, `cancelOrder`, `opsOverride`, etc.) so invalid transitions fail in the engine, not only in the UI.
- **Overrides:** `action: 'override'` requires **`order_override`** (`ops_admin`, `ops_manager`, `super_admin`). Engine **`opsOverride`** should persist rationale and respect state machine rules.

---

## Finance control

- **Dashboard:** Server-loaded via **`getEngine().ops.getFinanceOperations`** — summary, pending refunds, **`recentLedger`** from **`ledger_entries`** where implemented.
- **Refunds:** **`POST /api/orders/[id]/refund`** — finance role + shared Stripe helper; ledger remains authoritative for posted entries.
- **Exports:** CSV exports including Stripe webhook audit trail where Phase 9 wired `type=stripe_events`.
- **Gaps (IRR-021 / IRR-028):** Full CFO-grade reconciliation UI, automated CSV↔ledger tests, and deep payout visibility may remain **PARTIAL** until later phases; see execution tracker.

---

## Chef / vendor control

- APIs under **`/api/chefs`**, **`/api/engine/storefronts/[id]`**, approvals dashboard — governed by **`chefs_governance`** / **`storefront_ops`** as implemented in each route.
- All mutations require appropriate capability (not `support_agent` alone).

---

## Driver control

- **`/api/deliveries`**, **`/api/deliveries/[id]`**, **`/api/engine/dispatch`**, driver directory routes — **`deliveries_read` / `deliveries_write`**, **`dispatch_*`**, **`drivers_governance`**.
- **PARTIAL** if reassignment is read-only or limited by schema; document in tracker when true.

---

## Audit visibility

- **Partial implementation:** `GET /api/audit/recent` (JSON), `/dashboard/activity` (server-rendered when allowed), order detail **timeline** when actor has **`audit_timeline_read`**.
- **Future:** Rich filters, domain_events correlation, export — Phase 11+ / 15 as needed.

---

## System settings

- **`/api/engine/settings`**: read/update platform rules — **`platform_settings` → `super_admin` only** in the capability matrix.

---

## Deferred work (by phase)

| Phase | Scope |
|-------|--------|
| **11 — Realtime** | Live order board updates via typed realtime (`IRR-010`); remove unsafe casts in hooks |
| **12 — Notifications / support** | Durable notifications, support ticket RLS depth (`IRR-023`, `IRR-033`) |
| **15 — Security** | Upload hardening, log redaction, web admin query scoping (`IRR-003`, `IRR-026`, `IRR-027`) |

---

## Tests

- **Engine:** `packages/engine/src/services/platform-api-guards.test.ts` — `guardPlatformApi` / role matrix (Vitest).
- **Ops-admin:** Jest includes **`src/__tests__/platform-wiring.test.ts`** — `hasPlatformApiCapability` parity checks (jsdom-safe, no `Response`).

Run:

```bash
pnpm --filter @ridendine/engine test
pnpm --filter @ridendine/ops-admin test
pnpm --filter @ridendine/ops-admin typecheck
```

---

## Change control

When adding a new ops-admin API route:

1. Choose a **`PlatformApiCapability`** or extend the enum in **`platform-api-guards.ts`** with an explicit role list.
2. Call **`guardPlatformApi`** before work; return the `Response` if non-null.
3. Update this doc and **`AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md`** if behavior is user-visible or IRR-related.
