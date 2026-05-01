# Business engine foundation (Phase 5)

**Purpose:** Define the boundary of `@ridendine/engine` so business rules stay centralized, testable, and consistent with [`docs/ORDER_FLOW.md`](ORDER_FLOW.md) and [`docs/API_FOUNDATION.md`](API_FOUNDATION.md).

---

## Final engine boundary

| Layer | Responsibility |
|-------|----------------|
| **UI (`apps/*/`)** | Presentation, forms, navigation, optimistic UX only — **no** authoritative totals, **no** payment capture, **no** order state mutations without calling API/engine. |
| **API (Next route handlers)** | Auth/session, role checks (`guardPlatformApi` for ops), parse/validate input, call **engine** or thin DB reads, map errors to HTTP — **no** duplicated lifecycle rules. |
| **Engine (`packages/engine`)** | Order/delivery/payout state machines, commerce/ledger orchestration, SLA, notifications triggers, **RiskEngine** pre-checks, audit logger usage on mutations, domain events where implemented. |
| **DB (`packages/db` + migrations)** | Persistence, RLS, repositories — **schema source of truth** in `supabase/migrations`; generated types from live DB. |

---

## Required engine modules (target architecture)

| Module | Role | Phase 5 status |
|--------|------|----------------|
| `order-state-machine` | Allowed order + delivery + payout transitions | **Exists** |
| `master-order-engine` | Order mutations, `order_status_history`, coordination | **Exists** |
| `delivery-engine` | Delivery transitions + permissions | **Exists** |
| `commerce.engine` | Merchant-of-record / ledger-related commerce | **Exists** |
| `payout-engine` | Payout lifecycle | **Exists** |
| `kitchen.engine` / `dispatch.engine` / `ops.engine` / `platform.engine` | Domain facades | **Exists** |
| `risk.engine` | Deterministic risk signals before payment / sensitive ops | **Added Phase 5** |
| Full **AuditEngine** as separate module | Not required Phase 5 — **`AuditLogger`** in `core/audit-logger.ts` used by commerce and engines | **Partial — use existing logger** |

---

## Rules for future phases

1. **Money** — Every charge, capture, refund, or fee adjustment must go through **commerce / payment paths** and persist **`ledger_entries`** (or documented exception) — Phase 9.
2. **Admin** — Sensitive ops and overrides must write **`audit_logs`** / **`ops_override_logs`** as applicable — Phase 10 expands coverage. Canonical ops surface and capability matrix: **`docs/ADMIN_OPS_CONTROL_CENTER.md`**.
3. **Order status** — Every engine-driven status change must persist **`order_status_history`** and emit/propagate **`domain_events`** per existing `MasterOrderEngine` patterns — tighten any gaps in Phase 6+.
4. **Notifications** — **Durable first** (DB row / engine record), **provider second** (Resend, push) — Phase 12.
5. **Risk** — **`RiskEngine.evaluate*`** (or composed `evaluateCheckoutRisk`) should run **before** creating PaymentIntents or submitting orders once routes are wired — **Phase 6 (checkout API)** and **Phase 9 (payment)**; no live checkout wiring in Phase 5.
6. **Realtime** — Typed channels and payload validation — Phase 11.

---

## RiskEngine (`packages/engine/src/orchestrators/risk.engine.ts`)

- **No external HTTP** — pure functions for unit tests and CI.
- **Thresholds** — `DEFAULT_RISK_LIMITS` (`LARGE_ORDER_AMOUNT_CENTS`, `CHECKOUT_ATTEMPT_REVIEW_THRESHOLD`, `ALLOWED_CURRENCIES`); change only with product/finance sign-off and update this doc.
- **Exports** — `evaluateCheckoutRisk`, `evaluateOrderRisk`, `evaluateCustomerRisk`, `evaluatePaymentRisk`, `RiskEngine` namespace, types, `DEFAULT_RISK_LIMITS`.

---

## Order vs delivery ownership (IRR-017 summary)

- **Canonical order lifecycle strings** — `@ridendine/types` **`EngineOrderStatus`** (snake_case values such as `pending`, `driver_en_route_pickup`, `completed`).
- **Canonical delivery lifecycle** — **`EngineDeliveryStatus`** (`unassigned` → … → `delivered` / `failed` / `cancelled`).
- **Transition authority** — `packages/engine/src/orchestrators/order-state-machine.ts` (`ORDER_TRANSITION_MAP`, `DELIVERY_TRANSITION_MAP`); **`MasterOrderEngine`** and **`DeliveryEngine`** perform writes and history/events where implemented.
- **Legacy DB / UI labels** — `ENGINE_TO_LEGACY_ORDER_STATUS` and `ENGINE_TO_LEGACY_DELIVERY_STATUS` in the same file map engine statuses to older `orders.status` / delivery row values — see **`docs/ORDER_FLOW.md`** for the human-readable matrix.

---

## Audit / domain event gaps (review only, Phase 5)

Documented for later work:

| Area | Observation |
|------|-------------|
| **Master order engine** | Inserts `order_status_history` and uses `AuditLogger` in orchestration paths — extend coverage if any transition bypasses the engine. |
| **Commerce / refunds** | Uses `AuditLogger` + `DomainEventEmitter` — ensure all money paths in Phase 9 call the same patterns. |
| **RiskEngine** | Emits structured **`auditPayload`** only in-memory; **persist** risk decisions to `audit_logs` / `domain_events` when product requires it (Phase 10 / 15). |

---

*Maintained under Ridendine production upgrade — Phase 5 deliverable.*
