# Phase 3 — Auto-dispatch + ops override — completion report

**Date:** 2026-05-03  
**Scope:** Ranked dispatch, realtime driver offers (no polling), retry/expire chain, ops force-assign, dispatch console, tests, docs. **Phase 4 not started.**

## Phase 0 / 1 / 2 gates

Read **`PHASE_0_COMPLETION_REPORT.md`**, **`PHASE_1_COMPLETION_REPORT.md`**, **`PHASE_2_COMPLETION_REPORT.md`**: all **PASS** — Phase 3 proceeded.

## Overall status: **PASS** (with notes)

| Area | Result | Notes |
|------|--------|--------|
| `DispatchEngine` API surface | **PASS** | `onOrderReadyForPickup`, `offerToNextDriver`, `respondToOffer`, `expireAttempt`, public `escalateToOps`, `forceAssign`, `findAndAssignDriver` → `offerToNextDriver`, private `rankCandidates`, `loadDispatchTuning`. |
| Ranking | **PASS** | `rankCandidates` uses **`EtaService.rankDrivers`** when ETA service present; fallback uses estimated minutes. |
| Offer TTL / max attempts | **PASS** | `getDispatchSettings` merges **`service_areas`** (`offer_ttl_seconds`, `max_offer_attempts`) with **`getPlatformSettings`**. |
| Broadcast contract | **PASS** | All driver pushes via **`broadcastDriverOffer`**; payloads stripped of coordinate keys; events **`offer`** / **`offer_expired`** (optional legacy **`offer_update`** on emitter). |
| Phase 2 customer contract | **PASS** | **`broadcastPublic`** / customer UI untouched; driver location route only narrowed types for lagging `database.types`. |
| Ops override | **PASS** | **`POST /api/engine/dispatch`** `force_assign` + **`forceAssign`** → **`manualAssign`** with reason; audit / override logs preserved. |
| Escalation | **PASS** | **`order_exceptions`** (`ops_dispatch_required` for dispatch failures), **`delivery_events`**, **`system_alerts`**, audit log. |
| Tests | **PASS** | Engine `dispatch.engine.test.ts` (Phase 3 cases); driver `offers-route.test.ts`; full **`pnpm test`** green. |
| `pnpm typecheck` / `pnpm lint` | **PASS** | See commands. |

### WARN

- **`graphify` rebuild** (`python3` / `py -3` + `graphify.watch`) did not complete in this environment within the tool window — re-run locally when graph tooling is installed.
- **Geospatial service-area filter** for “driver inside polygon” is **not** wired; ranking uses radius + ETA matrix as before.
- **Supabase generated types** still lag Phase 0/2 columns on some selects; **`driver-app` location route** uses explicit row casts for `public_stage` / delivery ETA columns so **`pnpm typecheck`** stays green until **`pnpm db:generate`**.

### Risks

- **Realtime**: driver offer UX depends on **`NEXT_PUBLIC_SUPABASE_*`** and Realtime broadcast; failures log in **`broadcastDriverOffer`** without blocking HTTP.
- **Concurrent processors** calling **`expireAttempt`** on the same row: update is conditional on **`response = pending`** and **`expires_at <= now`** to reduce double chain.

---

## Files created

| Path |
|------|
| `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` |
| `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts` |
| `apps/driver-app/src/__tests__/offers-route.test.ts` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_3_COMPLETION_REPORT.md` (this file) |

---

## Files modified

| Path |
|------|
| `packages/engine/src/orchestrators/dispatch.engine.ts` |
| `packages/engine/src/orchestrators/dispatch.engine.test.ts` |
| `packages/engine/src/core/event-emitter.ts` |
| `packages/engine/src/core/event-emitter.broadcast-public.test.ts` |
| `packages/validation/src/schemas/ops.ts` |
| `packages/types/src/engine/index.ts` (`DispatchQueueItem` map fields) |
| `packages/db/src/repositories/ops.repository.ts` (`buildDispatchItem`) |
| `apps/driver-app/src/components/offer-alert.tsx` |
| `apps/driver-app/src/app/components/DriverDashboard.tsx` |
| `apps/driver-app/src/app/api/offers/route.ts` |
| `apps/driver-app/src/app/api/location/route.ts` (type casts for generated DB types) |
| `apps/ops-admin/src/app/api/engine/dispatch/route.ts` |
| `apps/ops-admin/src/components/DashboardLayout.tsx` (nav) |
| `apps/ops-admin/src/components/map/delivery-map.tsx` |
| `apps/ops-admin/package.json` (`@ridendine/routing`) |
| `docs/BUSINESS_ENGINE.md`, `docs/ORDER_FLOW.md`, `docs/APP_CONNECTIONS.md` |

---

## Dispatch behavior (summary)

- **`offerToNextDriver`**: blocks duplicate live **`pending`** offers; respects max attempts; ranks drivers; inserts **`assignment_attempts`**; notifies; **`broadcastDriverOffer(..., 'offer')`**; audit **`create`** on attempt.
- **`expireAttempt`**: atomic pending→expired; **`offer_expired`** broadcast; domain event; next offer or **`escalateToOps`** when counts hit cap.
- **`escalateToOps`**: delivery flagged; exception + delivery_event + alert + audit.
- **`forceAssign`**: ops-only path with explicit reason string into override audit trail.

---

## Offer chain flow

See **`docs/ORDER_FLOW.md`** mermaid: ready → rank → offer → accept/decline/TTL → next or escalate.

---

## Realtime behavior

- Channel **`driver:{driverId}:offers`**.
- Events **`offer`** (payload: attemptId, deliveryId, expiresAt, addresses, distance/payout summaries — **no lat/lng**), **`offer_expired`**.

---

## Ops override behavior

- **`POST /api/engine/dispatch`** with **`action: "force_assign"`**, **`deliveryId`**, **`driverId`**, **`reason`** (validated by Zod).
- Engine:**`forceAssign`** → **`manualAssign`** with same RBAC and **`computeFullOnAssign`**.

---

## Tests added

- `packages/engine/src/orchestrators/dispatch.engine.test.ts` — Phase 3: ranked offer + broadcast, `respondToOffer` guard, `forceAssign` delegation.
- `apps/driver-app/src/__tests__/offers-route.test.ts` — POST accept → **`respondToOffer`**.

---

## Commands run

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ridendine/engine vitest run src/orchestrators/dispatch.engine.test.ts
pnpm exec jest src/__tests__/offers-route.test.ts   # from apps/driver-app
```

---

## Errors encountered and resolution

- **`respondToOffer` return type** vs **`declineOffer`**: set **`declineOffer`** to **`Promise<OperationResult<void>>`**.
- **`driver-app` typecheck** on location **`select`** vs generated schema: added **narrowing casts** for snapshot rows.
- **Ops lint** `prefer-const` in offer-history route: **`const`** for Maps.

---

## Phase 4 recommendation (exact)

**Phase 4 — Ops live board & automation:** extend **`/dashboard/dispatch`** (or dedicated live view) with **sub-second** driver positions (ops-only channels), **websocket/SSE fallback** when Realtime degrades, **drag-assign** from map to delivery, **SLA timers** surfaced on the same board, and **automated processor** dashboards (queue depth, expire backlog). **Do not** widen customer **`order:{id}`** payloads; keep finance/ledger out of scope until Phase 5.

**STOP** — Phase 3 complete; Phase 4 not implemented in this session.
