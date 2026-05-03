# Phase 4 — Live operations board — completion report

**Date:** 2026-05-02  
**Scope:** Replace ops-admin dashboard core with **`LiveBoard`**: realtime **`ops:live`** feed, order/driver/chef columns, internal map with driver pins, client-only SLA badges, snapshot API, reducer tests, docs. **Phase 5 not started.**

## Phase 0 / 1 / 2 / 3 gates

Read **`PHASE_0_COMPLETION_REPORT.md`** through **`PHASE_3_COMPLETION_REPORT.md`**: all **PASS** — Phase 4 proceeded.

## Overall status: **PASS** (with notes)

| Area | Result | Notes |
|------|--------|--------|
| Dashboard root | **PASS** | `apps/ops-admin/src/app/dashboard/page.tsx` — KPI strip + engine bar retained; **`LiveBoard`** is the primary operational surface; charts / **`RealTimeStats`** / **`AlertsPanel`** / platform overview card removed (board replaces duplicate realtime). |
| **`ops:live`** | **PASS** | `opsLiveBoardChannel()` in `@ridendine/db`; hook subscribes with **`postgres_changes`** on orders, deliveries, driver_presence, chef_storefronts; **`broadcast`** `ops.live.patch` + `board.refresh`. |
| Merge / dedupe | **PASS** | `liveFeedReducer` + `patchOrderFromRow` / delivery / presence / chef patches; stale guard via **`updated_at`** ordering. |
| SLA (UI) | **PASS** | `computeOrderSlaFlags` in `apps/ops-admin/src/lib/ops-sla.ts` — not persisted; does not touch engine SLA tables. |
| Map (internal) | **PASS** | `DeliveryMap` extended with **`driverPins`**, highlight, **`onDeliveryClick`**; ops-only caption on board. |
| Dispatch / ledger | **PASS** | No changes under `packages/engine` dispatch core or ledger paths for this phase. |
| Tests | **PASS** | `src/hooks/__tests__/use-ops-live-feed.test.ts` (reducer behavior); `packages/db` **`channels.test.ts`** includes `ops:live`. |
| **`pnpm typecheck`** | **PASS** | Full turbo run after `ready_at` fix in reducer return. |
| **`pnpm lint`** | **PASS** | Turbo lint (includes ops-admin expanded paths). |
| **`pnpm test`** | **PASS** | Recursive workspace tests (includes new hook tests). |

### WARN

- **`ops:live` broadcast** handlers (`ops.live.patch`, `board.refresh`) are wired for **forward-compatible** server pushes; today most deltas still arrive via **`postgres_changes`** (same as other ops surfaces). Emitting **`board.refresh`** from a trusted worker after assignment/escalation would make “instant” feel more uniform without duplicating DB writes.
- **Realtime RLS / publication**: if a table is not in the Supabase Realtime publication or RLS blocks the ops role, that slice of the board will only update on **hydration** / **60s fallback** until fixed in Supabase config.
- **`graphify` rebuild** was started per workspace rule; confirm **`graphify-out/GRAPH_REPORT.md`** updated locally if the Python environment is available.

### Risks

- **Hydration volume**: snapshot caps orders at **400** rows / **48h** `updated_at` window; very hot markets may need pagination or server-side filters later.
- **`chef_storefronts` → `chef_profiles`** embed depends on PostgREST relationship naming; if the embed fails at runtime, chefs column still renders from storefront row with display name fallback.

### Errors during validation

- Initial **`pnpm typecheck`**: `OpsLiveOrderSnapshot` missing **`ready_at`** in one `patchOrderFromRow` return object — **fixed** in `apps/ops-admin/src/lib/ops-live-feed-reducer.ts`.

---

## Files created

| Path |
|------|
| `apps/ops-admin/src/app/api/ops/live-board/route.ts` |
| `apps/ops-admin/src/app/dashboard/_components/live-board.tsx` |
| `apps/ops-admin/src/app/dashboard/_components/orders-column.tsx` |
| `apps/ops-admin/src/app/dashboard/_components/drivers-column.tsx` |
| `apps/ops-admin/src/app/dashboard/_components/chefs-column.tsx` |
| `apps/ops-admin/src/hooks/use-ops-live-feed.ts` |
| `apps/ops-admin/src/hooks/__tests__/use-ops-live-feed.test.ts` |
| `apps/ops-admin/src/lib/ops-live-feed-types.ts` |
| `apps/ops-admin/src/lib/ops-live-feed-reducer.ts` |
| `apps/ops-admin/src/lib/ops-sla.ts` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_4_COMPLETION_REPORT.md` (this file) |

---

## Files modified

| Path |
|------|
| `apps/ops-admin/src/app/dashboard/page.tsx` |
| `apps/ops-admin/src/components/map/delivery-map.tsx` |
| `apps/ops-admin/package.json` (lint paths) |
| `packages/db/src/realtime/channels.ts` |
| `packages/db/src/realtime/channels.test.ts` |
| `packages/db/src/realtime/events.ts` |
| `docs/BUSINESS_ENGINE.md` |
| `docs/ORDER_FLOW.md` |
| `docs/APP_CONNECTIONS.md` |

---

## Commands run

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ridendine/ops-admin typecheck
pnpm --filter @ridendine/ops-admin lint
pnpm --filter @ridendine/ops-admin test
```

---

## Phase 5 recommendation (exact)

**Phase 5 should focus on closing the realtime “intent gap” without weakening privacy:** (1) add a **small server-side relay** (Edge Function or engine hook) that sends **`ops.live.patch`** or **`board.refresh`** on `domain_events` types that Postgres replication delays make feel sluggish (assignment accepted, escalation); (2) optionally **persist board-relevant SLA snapshots** read-only for audit (separate from customer SLA timers); (3) add **E2E smoke** for `/dashboard` with mocked Supabase; (4) tune **snapshot window** (cursor / `updated_at` paging) for scale. Do **not** move driver coordinates to customer channels; keep **`mapEngineStatusToPublicStage`** as the single customer stage source.

**STOP** — Phase 4 complete; Phase 5 deferred.
