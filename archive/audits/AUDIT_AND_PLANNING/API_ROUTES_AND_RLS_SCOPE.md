# API routes and RLS — full scope and spot-check plan

**Purpose:** Inventory every Next.js App Router API handler (`**/app/api/**/route.ts`), classify how each touches Postgres (RLS vs service role), and define a **repeatable RLS spot-check** you can execute in staging.

**Counts (repo scan):** **77** `route.ts` files across four apps (`apps/web`, `apps/chef-admin`, `apps/driver-app`, `apps/ops-admin`). Per app: **web 18**, **chef-admin 13**, **driver-app 11**, **ops-admin 35**. Of these, **51** import `createAdminClient` and **26** do not (session-only, health-only, or Engine-only route modules). No `pages/api` legacy routes found under `apps/`.

**Canonical auth docs:** [`docs/AUTH_ROLE_MATRIX.md`](../docs/AUTH_ROLE_MATRIX.md), [`docs/CROSS_APP_CONTRACTS.md`](../docs/CROSS_APP_CONTRACTS.md).

---

## 1. How Postgres sees your API

| Tier | Mechanism | RLS applies? | Primary risk if misconfigured |
|------|-----------|--------------|-------------------------------|
| **A — Session client** | `createServerClient(cookieStore)` from `@ridendine/db` | **Yes** (JWT / role from cookies) | Cross-tenant reads/writes if policies are too loose |
| **B — Admin client in route** | `createAdminClient()` in `packages/db/src/client/admin.ts` | **No** (service role bypasses RLS) | **Application-layer** auth must be correct on every path |
| **C — Central Engine** | `getEngine()` from `apps/ops-admin/src/lib/engine` → `packages/engine/src/server.ts` uses `createAdminClient()` | **No** at DB | Same as B; **`guardPlatformApi`** + `finalizeOpsActor` are the gate |
| **D — Webhooks** | `POST /api/webhooks/stripe` uses admin after signature verification | **No** at DB | Forged/duplicate events, idempotency |

**Implication:** RLS spot-checks on Tier **B/C/D** validate **“would RLS have blocked a mistake if we used a user client?”** — they are **design reviews** and **cross-checks** that route logic filters by tenant/role, not live RLS enforcement during that request.

---

## 2. Files with **no** `createAdminClient` import (Tier A / engine-only surface)

These **26** route modules do **not** import `createAdminClient`. Data access is either session-scoped (`createServerClient`) or delegated to **Engine** (which still uses admin internally — Tier C).

| App | Path (under `src/app/api`) | Methods | DB tier |
|-----|----------------------------|---------|---------|
| web | `health` | GET | None / env |
| web | `addresses` | GET, POST, PATCH, DELETE | **A** |
| web | `cart` | GET, POST, PATCH, DELETE | **A** |
| web | `auth/login` | POST | **A** (auth) |
| web | `auth/signup` | POST | **A** (+ `createCustomer` RPC/repo pattern) |
| web | `profile` | GET, PATCH | **A** |
| web | `notifications` | GET, POST, PATCH | **A** |
| web | `notifications/subscribe` | POST, DELETE | **A** |
| chef-admin | `health` | GET | None |
| chef-admin | `payouts/request` | POST | **A** |
| chef-admin | `payouts/setup` | POST | **A** |
| chef-admin | `profile` | GET, PATCH | **A** |
| chef-admin | `menu/categories` | GET, POST | **A** |
| driver-app | `health` | GET | None |
| driver-app | `auth/login` | POST | **A** |
| driver-app | `auth/logout` | POST | **A** |
| ops-admin | `health` | GET | None |
| ops-admin | `engine/dispatch` | GET, POST | **C** |
| ops-admin | `engine/settings` | GET, POST | **C** |
| ops-admin | `engine/exceptions` | GET, POST | **C** |
| ops-admin | `engine/exceptions/[id]` | GET, PATCH | **C** |
| ops-admin | `engine/refunds` | GET, POST | **C** |
| ops-admin | `engine/finance` | GET, POST | **C** |
| ops-admin | `deliveries/[id]` | PATCH | **C** |
| ops-admin | `chefs/[id]` | PATCH | **C** |
| ops-admin | `drivers/[id]` | PATCH | **C** |

All other API `route.ts` files (**51**) import `createAdminClient` (alone or together with `createServerClient`). Treat them as **Tier B** (or B+C if they also call Engine).

---

## 3. Full route inventory by app

Convention: paths are relative to each app’s public origin (e.g. `https://web.example.com/api/...`). Dynamic segments shown as `[id]`.

### 3.1 `apps/web` (customer) — **18** modules

| HTTP | Path |
|------|------|
| GET | `/api/health` |
| GET, POST, PATCH, DELETE | `/api/addresses` |
| GET, POST, PATCH, DELETE | `/api/cart` |
| POST | `/api/checkout` |
| GET, POST | `/api/favorites` |
| POST | `/api/auth/login` |
| POST | `/api/auth/signup` |
| GET, PATCH | `/api/profile` |
| GET | `/api/orders` |
| GET, PATCH | `/api/orders/[id]` |
| GET, POST, PATCH | `/api/notifications` |
| POST, DELETE | `/api/notifications/subscribe` |
| POST | `/api/upload` |
| POST | `/api/webhooks/stripe` |
| GET | `/api/support/tickets` |
| GET | `/api/support/tickets/[id]` |
| POST, GET | `/api/support` |
| POST, GET | `/api/reviews` |

### 3.2 `apps/chef-admin` — **13** modules

| HTTP | Path |
|------|------|
| GET | `/api/health` |
| POST | `/api/auth/signup` |
| GET | `/api/orders` |
| GET, PATCH | `/api/orders/[id]` |
| GET, POST, PATCH | `/api/storefront` |
| GET, PUT | `/api/storefront/availability` |
| GET, POST | `/api/menu` |
| GET, POST | `/api/menu/categories` |
| GET, PATCH, DELETE | `/api/menu/[id]` |
| GET, PATCH | `/api/profile` |
| POST | `/api/payouts/request` |
| POST | `/api/payouts/setup` |
| POST | `/api/upload` |

### 3.3 `apps/driver-app` — **11** modules

| HTTP | Path |
|------|------|
| GET | `/api/health` |
| POST | `/api/auth/login` |
| POST | `/api/auth/signup` |
| POST | `/api/auth/logout` |
| GET, POST | `/api/offers` |
| GET | `/api/deliveries` |
| GET, PATCH | `/api/deliveries/[id]` |
| POST | `/api/location` |
| GET, PATCH | `/api/driver` |
| GET, PATCH | `/api/driver/presence` |
| GET | `/api/earnings` |

### 3.4 `apps/ops-admin` — **35** modules

| HTTP | Path |
|------|------|
| GET | `/api/health` |
| GET | `/api/orders` |
| GET, PATCH | `/api/orders/[id]` |
| POST | `/api/orders/[id]/refund` |
| GET | `/api/deliveries` |
| PATCH | `/api/deliveries/[id]` |
| GET | `/api/chefs` |
| POST | `/api/chefs` |
| PATCH | `/api/chefs/[id]` |
| GET | `/api/drivers` |
| POST | `/api/drivers` |
| PATCH | `/api/drivers/[id]` |
| GET | `/api/customers` |
| POST | `/api/customers` |
| POST | `/api/customers/[id]/notify` |
| GET, POST | `/api/support` |
| PATCH | `/api/support/[id]` |
| GET | `/api/export` |
| GET | `/api/analytics/trends` |
| GET, POST, PATCH | `/api/promos` |
| GET | `/api/audit/recent` |
| GET, POST, PATCH | `/api/team` |
| POST | `/api/announcements` |
| GET, POST | `/api/engine/dashboard` |
| GET, POST | `/api/engine/dispatch` |
| GET | `/api/engine/health` |
| GET, POST | `/api/engine/settings` |
| GET, PATCH | `/api/engine/rules` |
| GET, POST | `/api/engine/maintenance` |
| GET, POST | `/api/engine/payouts` |
| GET, POST | `/api/engine/finance` |
| GET, POST | `/api/engine/refunds` |
| GET, POST | `/api/engine/exceptions` |
| GET, PATCH | `/api/engine/exceptions/[id]` |
| GET, PATCH | `/api/engine/orders/[id]` |
| GET, PATCH | `/api/engine/storefronts/[id]` |
| GET, POST | `/api/engine/processors/sla` |
| GET, POST | `/api/engine/processors/expired-offers` |

---

## 4. RLS — where it lives in migrations

Use these files as the **source of truth** for policy names and table coverage (read in order for cumulative state):

| Migration | RLS / policy focus |
|-----------|-------------------|
| [`supabase/migrations/00001_initial_schema.sql`](../supabase/migrations/00001_initial_schema.sql) | Base tables |
| [`supabase/migrations/00002_rls_policies.sql`](../supabase/migrations/00002_rls_policies.sql) | Initial RLS |
| [`supabase/migrations/00003_fix_rls.sql`](../supabase/migrations/00003_fix_rls.sql) | Broad `ENABLE ROW LEVEL SECURITY` + core policies |
| [`supabase/migrations/00005_anon_read_policies.sql`](../supabase/migrations/00005_anon_read_policies.sql) | **`anon` SELECT` policies** — **critical** for any direct PostgREST / anon-key exposure |
| [`supabase/migrations/00004_additions.sql`](../supabase/migrations/00004_additions.sql) | Platform settings, driver locations, notifications, promos, push, payouts |
| [`supabase/migrations/00007_central_engine_tables.sql`](../supabase/migrations/00007_central_engine_tables.sql) | Engine tables: `domain_events`, `order_exceptions`, `sla_timers`, `kitchen_queue_entries`, `ledger_entries`, `assignment_attempts`, `ops_override_logs`, `refund_cases`, `payout_adjustments`, `system_alerts`, `storefront_state_changes` |
| [`supabase/migrations/00009_ops_admin_control_plane.sql`](../supabase/migrations/00009_ops_admin_control_plane.sql) | Ops control plane policies |
| [`supabase/migrations/00010_contract_drift_repair.sql`](../supabase/migrations/00010_contract_drift_repair.sql) | `platform_settings`, `audit_logs` RLS |
| [`supabase/migrations/00011_rls_role_alignment.sql`](../supabase/migrations/00011_rls_role_alignment.sql) | Driver locations, promos, payouts, notifications insert |
| [`supabase/migrations/00013_analytics_events.sql`](../supabase/migrations/00013_analytics_events.sql) | `analytics_events` |
| [`supabase/migrations/00014_fix_audit_trigger.sql`](../supabase/migrations/00014_fix_audit_trigger.sql) | Audit trigger (not only RLS) |
| [`supabase/migrations/00015_phase2_platform_roles.sql`](../supabase/migrations/00015_phase2_platform_roles.sql) | Platform roles |
| [`supabase/migrations/00016_phase3_stripe_idempotency_order_events_promo.sql`](../supabase/migrations/00016_phase3_stripe_idempotency_order_events_promo.sql) | `stripe_events_processed` RLS |

**Spot-check priority:** `00005_anon_read_policies.sql` — confirm whether `anon` is ever used from clients and whether those policies match product intent (they are **not** mitigated by server routes that use the service role).

---

## 5. RLS spot-check procedure (staging)

### 5.1 Prerequisites

- Two **customer** test users (A and B), one **chef**, one **driver**, one **ops** user with minimal role and one with elevated role (see [`docs/AUTH_ROLE_MATRIX.md`](../docs/AUTH_ROLE_MATRIX.md)).
- Supabase SQL editor or `psql` to run `SELECT` as each JWT role if you bypass HTTP.
- Optional: `SET request.jwt.claim.sub = '...'` in a transaction-scoped test (project-specific; prefer HTTP + cookies for fidelity).

### 5.2 Tier A — direct RLS enforcement

For each route in §2 marked **A**, for **GET/PATCH/DELETE** that returns or mutates tenant-owned rows:

| Step | Action | Pass criterion |
|------|--------|----------------|
| 1 | Call as **owner** | 200 / expected body |
| 2 | Call as **other user same role** (e.g. customer B for customer A’s address id) | **404** or **403** or empty set — never another tenant’s PII |
| 3 | Unauthenticated (no session) | **401** where middleware/route requires session |

**High-value Tier A routes:** `addresses`, `cart`, `profile`, `notifications`, `notifications/subscribe`, chef `profile`, chef `menu/categories` (POST creates under correct `chef_storefront` / kitchen linkage — verify FK + RLS together).

### 5.3 Tier B — admin client in route

For each file in §3 that uses `createAdminClient`:

| Step | Action | Pass criterion |
|------|--------|----------------|
| 1 | Map handler to **tables** touched (read `route.ts` + `@ridendine/db` repository). | Written test matrix row |
| 2 | Confirm **pre-query** filter: `customer_id`, `chef_id`, `driver_id`, `user_id`, or `order_id` scoped from **session-derived** id, not from raw client-supplied id alone. | Id cannot be swapped to escalate |
| 3 | Ops-only routes: hit with **customer** session cookie against ops app host | **401/403** and no body leak |

**Examples to treat as mandatory in review:** `web` `orders`, `orders/[id]`, `checkout`, `favorites`, `reviews`, `upload`; `driver-app` `deliveries`, `deliveries/[id]`, `location`, `driver`, `presence`, `earnings`, `offers`; `chef-admin` `orders`, `storefront`, `menu`, `menu/[id]`, `upload`.

### 5.4 Tier C — Engine (`ops-admin`)

| Step | Action | Pass criterion |
|------|--------|----------------|
| 1 | For each `guardPlatformApi` capability in the route, call with **forbidden** role | **403** `FORBIDDEN` |
| 2 | Call with **allowed** role | 200 and action reflected in DB |
| 3 | Cross-check Engine write paths against **§4** policies (`ledger_entries`, `refund_cases`, `ops_override_logs`, etc.) | Audit / finance rules documented in [`docs/SECURITY_HARDENING.md`](../docs/SECURITY_HARDENING.md) if applicable |

Reference implementation: `packages/engine/src/server.ts` (`getEngine()` singleton uses service role).

### 5.5 Tier D — Stripe webhook

| Step | Action | Pass criterion |
|------|--------|----------------|
| 1 | POST without `Stripe-Signature` | **400** |
| 2 | POST with wrong secret | **400** |
| 3 | Duplicate event id | Idempotent no double-ledger (see `00016` + app handler) |

---

## 6. Suggested execution order (minimize time)

1. **SQL review:** `00005` anon policies + `00007` finance/ledger policies (30–45 min).  
2. **Tier A HTTP:** web `addresses` + `cart` + `notifications` + chef `profile` (1–2 h).  
3. **Tier B:** web `orders/[id]` + `checkout` + driver `deliveries/[id]` + chef `menu/[id]` (2–3 h).  
4. **Tier C:** `engine/settings`, `engine/refunds`, `engine/finance`, `engine/dispatch` with role matrix (2 h).  
5. **Webhook:** Stripe replay + duplicate (30 min).

---

## 7. Deliverables from this scope

| Artifact | Owner |
|----------|-------|
| Matrix spreadsheet (optional): columns `App`, `Route`, `Method`, `Tier`, `Tables`, `Session check`, `RLS check`, `Status` | Eng |
| Issues filed for any **Tier A** cross-tenant leak or **Tier B** missing session filter | Eng |
| Note in [`23_PHASE_COMPLETION_LOG.md`](23_PHASE_COMPLETION_LOG.md) when spot-check batch completes | Eng |

---

*Generated as a scoping artifact for full API + RLS review; update §3 if new `route.ts` files are added.*
