# Ridendine — Error and drift prevention rules

**Authority:** [`21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`](21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md) Parts 2–5, 8–11, 17.  
**Enforcement:** Phase gates [`24_PHASE_GATE_CHECKLIST.md`](24_PHASE_GATE_CHECKLIST.md); tracking [`22_EXECUTION_TRACKER.md`](22_EXECUTION_TRACKER.md).

These rules apply to **all implementation work** after planning ends. Violations require rollback or `BLOCKED` status until corrected.

---

## Rule IDs (reference in PRs / tracker Notes)

### R1 — Business logic placement

| ID | Rule |
|----|------|
| **R1.1** | Every **non-trivial business rule** belongs in `packages/engine` (or explicit engine sub-module), not in React `page.tsx` / `components/**` except pure presentation formatting. |
| **R1.2** | **UI calls API only** (Next route handlers or server actions that delegate to engine)—no direct `createAdminClient` from client components. |
| **R1.3** | **API validates auth and role** before calling engine (session + actor context + `platform_users` role for ops). |
| **R1.4** | **API calls engine** for mutations that change money, inventory, assignment, or order state; avoid duplicating engine logic in route files. |
| **R1.5** | **Engine writes durable state** to Postgres (and Stripe where applicable); route handlers return HTTP mapping only. |

### R2 — Money and ledger

| ID | Rule |
|----|------|
| **R2.1** | **Every money movement** (charge, capture, refund, fee adjustment) must have a corresponding **`ledger_entries`** row** (or documented exception approved in tracker) before marking payment-related IRR DONE. |
| **R2.2** | **Stripe** must use a **single shared factory**—no ad-hoc `new Stripe({ apiVersion: ... })` with different versions (`21` IRR-007). Grep gate: one `apiVersion` constant repo-wide for app code. |
| **R2.3** | **Webhooks** must verify signature and implement **idempotency** (e.g. store `stripe_event_id`) before side effects (`21` IRR-008). |

### R3 — Order and delivery truth

| ID | Rule |
|----|------|
| **R3.1** | **Every order status change** writes **`order_status_history`** (or renamed canonical table) **and** emits **`domain_events`** where the engine defines emission (`21` Part 4, Part 10). |
| **R3.2** | **Order status vocabulary** must match `packages/engine/src/orchestrators/order-state-machine.ts` and `orders.status`; **`docs/ORDER_FLOW.md`** must not contradict code after Phase 5 (`21` IRR-017). |
| **R3.3** | **Delivery** status transitions must not be implied only in UI—persist in `deliveries` / related tables per schema. |

### R4 — Auth, roles, admin

| ID | Rule |
|----|------|
| **R4.1** | **No `BYPASS_AUTH=true` in production**; production boot must fail if set (`packages/auth/src/middleware.ts`) — `21` IRR-030. |
| **R4.2** | **Ops admin:** middleware login is insufficient; **each sensitive `apps/ops-admin/src/app/api/**` handler** must assert role (`21` IRR-005). |
| **R4.3** | **Processor routes** (`apps/ops-admin/src/app/api/engine/processors/**`) must remain **token-gated**; tokens in secrets manager, rotated (`21` IRR-006). |
| **R4.4** | **Support/finance** (when implemented) must not share generic `ops_admin` permissions without explicit checks (`21` IRR-004, IRR-033). |

### R5 — Data access and service role

| ID | Rule |
|----|------|
| **R5.1** | **`createAdminClient` / service role** on customer web APIs (`apps/web/src/app/api/**`) is **high risk**: every query must be scoped by **verified** `customerId` (or equivalent) from session; add tests that attempt cross-tenant access (`21` IRR-003). |
| **R5.2** | Prefer **user-scoped Supabase client** with RLS where feasible; if service role is kept, **document rationale** in the route file header and tracker. |

### R6 — Duplication and drift (UI/API/docs)

| ID | Rule |
|----|------|
| **R6.1** | **No duplicate customer confirmation routes**—one canonical path + HTTP redirect for the other (`21` IRR-011). |
| **R6.2** | **No duplicate dashboards** for the same metric; ops metrics must come from **DB/API**, not parallel static arrays in components (`21` Part 4 drift table). |
| **R6.3** | **No duplicate password-strength implementations**—use `@ridendine/ui` only (`21` IRR-012). |
| **R6.4** | **Schema / docs / generated types** must be regenerated and reviewed together after each migration (`21` Part 2 database row). |

### R7 — Mock, demo, and production data

| ID | Rule |
|----|------|
| **R7.1** | **`supabase/seeds/seed.sql`** is **development only**; production deploy pipelines must **never** invoke `db:seed` (`21` IRR-015). |
| **R7.2** | **No fake restaurants, chefs, orders, prices, payments, driver locations, or dashboard metrics** in production code paths—tests may mock **only** under `**/__tests__**` or dedicated fixtures (`21` Part 13). |
| **R7.3** | **Production metrics** must come from **database queries or authenticated APIs**, not hardcoded business state (`21` Part 4). |
| **R7.4** | **CI placeholder keys** (`.github/workflows/ci.yml`) are allowed **only** in CI with no access to production data; rotate and use project-scoped test keys (`21` master audit). |

### R8 — Real-time

| ID | Rule |
|----|------|
| **R8.1** | **Realtime payloads** must be typed / validated—do not reintroduce unchecked `as any` in `packages/db/src/hooks/use-realtime.ts` (`21` IRR-010). |
| **R8.2** | **Channel naming** must follow documented convention in `docs/REALTIME.md` once Phase 11 creates it. |

### R9 — Observability and security hygiene

| ID | Rule |
|----|------|
| **R9.1** | **No sensitive logs** (PAN, full card, full address, raw JWT) in `console.log` / error strings—use redacted structured logging (`21` IRR-027). |
| **R9.2** | **File uploads** must enforce size/MIME and storage path rules; malware scanning policy per ops (`21` IRR-026). |

### R10 — Testing gate (no DONE without tests)

| ID | Rule |
|----|------|
| **R10.1** | **No implementation phase may be marked complete** in [`23_PHASE_COMPLETION_LOG.md`](23_PHASE_COMPLETION_LOG.md) **without** listed tests run and **PASS** recorded (`21` Phase 16, tracker policy). |
| **R10.2** | **No IRR may be `DONE`** without tests applicable to its acceptance criteria (or explicit `N/A` documented for doc-only issues in tracker Notes). |
| **R10.3** | **Lint** must gate CI once IRR-013 is addressed—do not merge “lint red” unless emergency with documented waiver in completion log. |

### R11 — Dependency and API surface

| ID | Rule |
|----|------|
| **R11.1** | **No new parallel API** for the same resource without deprecating the old path in the same PR or tracker entry (prevents duplicate APIs — `21` Part 4). |
| **R11.2** | **Health endpoints** should converge on one JSON schema across apps when IRR-036 is executed. |

---

## Quick compliance matrix

| Violation | Detected by | Corrective action |
|-----------|-------------|-------------------|
| Business rule in UI | Code review / eslint rule (future) | Move to engine + API |
| Unscoped service query | Security test | Add `customerId` filter + test |
| Stripe version drift | `rg apiVersion apps packages` | Single module |
| Mock data in prod path | Grep `seed`, hardcoded UUIDs | Remove / guard |
| Order UI ≠ DB status | E2E + unit | Fix engine or UI |
| Admin action no audit | DB audit | Add `audit_logs` write in engine |
| Webhook without idempotency | Stripe CLI replay | Add table + unique constraint |

---

*End of prevention rules.*
