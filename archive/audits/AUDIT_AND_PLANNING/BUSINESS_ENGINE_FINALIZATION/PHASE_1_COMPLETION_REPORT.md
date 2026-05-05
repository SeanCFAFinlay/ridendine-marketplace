# Phase 1 — Routing package + ETA service — completion report

**Date:** 2026-05-02  
**Scope:** `@ridendine/routing`, engine ETA wrapper, lifecycle hooks, tests, docs. **Phase 2 not started** (no customer tracking UI, no `refreshFromDriverPing` wiring from driver-app).

## Phase 0 gate

Read **`AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_0_COMPLETION_REPORT.md`**: overall **PASS** — Phase 1 proceeded.

## Overall status: PASS (with notes)

| Area | Result | Notes |
|------|--------|--------|
| `@ridendine/routing` package | **PASS** | Types, OSRM provider, Mapbox stub, polyline, progress, `EtaService`. |
| Engine thin wrapper + hooks | **PASS** | `createEtaService`; order orchestrator + dispatch engine best-effort ETA calls. |
| Privacy rules | **PASS** | No customer-facing coordinate exposure in this phase; docs state Phase 2 uses `route_progress_pct` / ETAs only. |
| Tests | **PASS** | Vitest under `packages/routing` + engine factory / `createEtaService` test — confirm via **Commands run** below. |
| Docs | **PASS** | `BUSINESS_ENGINE.md`, `ORDER_FLOW.md`, `APP_CONNECTIONS.md` updated. |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | **PASS** (2026-05-02) | Full `pnpm test` initially failed only on `eta.service.test.ts` mock hoisting; fixed with `vi.hoisted`. Re-run: engine **408** tests, routing **12** tests; `pnpm typecheck` / `pnpm lint` passed in same session. |

### WARN

- **OSRM public** (`router.project-osrm.org`) has **no SLA** and may **rate-limit**; production may need a self-hosted OSRM or a paid routing backend behind the same `RoutingProvider` interface.
- **`refreshFromDriverPing`** is implemented but **not** wired from driver-app APIs in Phase 1 (intentional).

---

## Files created

| Path |
|------|
| `packages/routing/package.json` |
| `packages/routing/tsconfig.json` |
| `packages/routing/vitest.config.ts` (if present) |
| `packages/routing/src/index.ts` |
| `packages/routing/src/types.ts` |
| `packages/routing/src/provider.ts` |
| `packages/routing/src/osrm.provider.ts` |
| `packages/routing/src/mapbox.provider.ts` |
| `packages/routing/src/polyline.ts` |
| `packages/routing/src/progress.ts` |
| `packages/routing/src/eta.service.ts` |
| `packages/routing/src/__tests__/osrm.provider.test.ts` |
| `packages/routing/src/__tests__/progress.test.ts` |
| `packages/routing/src/__tests__/eta.service.test.ts` |
| `packages/routing/src/__tests__/mapbox.provider.test.ts` (if present) |
| `packages/engine/src/services/eta.service.ts` |
| `packages/engine/src/services/eta.service.test.ts` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_1_COMPLETION_REPORT.md` (this file) |

---

## Files modified (representative)

| Path | Change |
|------|--------|
| `packages/engine/package.json` | `workspace:*` dependency on `@ridendine/routing`. |
| `packages/engine/src/index.ts` | Export `createEtaService` / `EtaService` type re-exports as applicable. |
| `packages/engine/src/core/engine.factory.ts` | Build `EtaService`, pass into order + dispatch orchestrators. |
| `packages/engine/src/orchestrators/order.orchestrator.ts` | After successful submit-to-kitchen flush → `computeInitial(orderId)` (best-effort). |
| `packages/engine/src/orchestrators/dispatch.engine.ts` | After assign / manual assign → `computeFullOnAssign`; after pickup status → `computeDropLegOnPickup`. |
| `packages/engine/src/core/engine-factory.test.ts` | Mock `createEtaService`; assert orchestrator receives ETA instance. |
| `docs/BUSINESS_ENGINE.md` | Routing provider contract, OSRM note, cached columns, ETA lifecycle, Phase 2 note. |
| `docs/ORDER_FLOW.md` | ETA & routing subsection. |
| `docs/APP_CONNECTIONS.md` | `@ridendine/routing` package row; engine → routing note. |

---

## Package changes

- **`@ridendine/routing`**: new workspace package.
- **`@ridendine/engine`**: depends on `@ridendine/routing` via `workspace:*`.

---

## Routing provider behavior

| Provider | Behavior |
|----------|----------|
| **OSRM** | `route` + `matrix` against `https://router.project-osrm.org`; timeout, retries on **429 / 5xx**, coordinate validation, typed errors. |
| **Mapbox** | Stub: throws **`Mapbox routing provider is not implemented`**; no env vars. |

---

## `EtaService` methods

| Method | Role |
|--------|------|
| `computeInitial(orderId)` | Kitchen/storefront pickup → customer; writes dropoff route + `eta_dropoff_at` + `routing_*`. |
| `computeFullOnAssign(deliveryId)` | Driver → pickup + pickup → dropoff; writes pickup + dropoff fields + ETAs. |
| `computeDropLegOnPickup(deliveryId)` | Driver → dropoff after pickup. |
| `refreshFromDriverPing(deliveryId, driverPos)` | Progress %, remaining seconds, `eta_dropoff_at`; for server/driver use until Phase 2. |
| `rankDrivers(deliveryId, candidates)` | Matrix with route fallback; ascending **seconds**. |

All writes target **Phase 0 `deliveries` columns** only (`route_to_*`, `eta_*`, `route_progress_pct`, `routing_*`).

---

## Lifecycle hooks wired

1. **Order → kitchen submitted** (`order.orchestrator`): `etaService.computeInitial(orderId)` after successful flush.
2. **Driver assigned** (`dispatch.engine`): `computeFullOnAssign(deliveryId)` after accept-offer or manual-assign flush.
3. **Picked up**: `computeDropLegOnPickup(deliveryId)` when delivery status transitions to picked up.

---

## Tests added

- **OSRM:** URL formatting (route + table), retry on **429**, invalid coordinates.
- **Progress / polyline:** encode/decode roundtrip, `computeProgressPct` clamping, safe handling of empty/malformed polylines.
- **EtaService:** fake provider + fake Supabase — column writes for `computeInitial`; `rankDrivers` sort order.
- **Mapbox stub:** throws expected message (if test file present).
- **Engine:** `createEtaService` constructs `OsrmProvider` + `EtaService`.

---

## Commands run

Run from repo root after `pnpm install`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ridendine/routing test
pnpm --filter @ridendine/routing typecheck
pnpm --filter @ridendine/engine test
pnpm --filter @ridendine/engine typecheck
```

### Command outputs summary

- **`pnpm install`:** exit **0** (workspace 15 projects).
- **`pnpm typecheck`:** turbo **13/13** tasks successful (includes `@ridendine/routing`, `@ridendine/engine`).
- **`pnpm lint`:** turbo **4/4** tasks successful (scoped app lint tasks).
- **`pnpm test`:** first run failed **`packages/engine`** suite `eta.service.test.ts` — `ReferenceError: Cannot access 'OsrmProvider' before initialization` (mock factory + hoisting). **Fix:** `vi.hoisted(() => ({ OsrmProvider, EtaService }))` in `eta.service.test.ts`.
- **After fix:** `pnpm --filter @ridendine/engine test` — **27** files, **408** tests passed; `pnpm --filter @ridendine/routing test` — **4** files, **12** tests passed; filtered **typecheck** exit **0**.
- **N/A:** `supabase db reset`, Docker, or live **Supabase** secrets were **not** required for these unit tests.

### Failures / errors

- **Resolved:** engine `eta.service.test.ts` mock hoisting (see above). No outstanding test failures at completion.

---

## Risks

1. **Public OSRM** reliability and **fair-use** limits in production traffic.
2. **Stale driver position** if `driver_presence` / last ping is old when computing assign or pickup legs.
3. **RLS / service role**: engine must use a client that can **update `deliveries`** for the routed rows (same as other engine mutations).

---

## Exact recommendation for Phase 2

1. **Realtime / customer:** Broadcast **`orders.public_stage`** (already Phase 0) plus **sanitized** fields: `deliveries.eta_dropoff_at`, `deliveries.route_progress_pct`, optional **rounded ETA text** — **never** raw `driver_presence` or chef GPS to the customer web channel.
2. **Driver app:** Pass **`deliveryId`** on location ping; server calls **`refreshFromDriverPing(deliveryId, point)`** with service-role client; validate the driver owns the delivery.
3. **Tests:** Contract test that customer subscription payloads **exclude** `*_lat` / `*_lng` for driver/chef live rows.
4. **Optional:** Feature flag **`routing_provider`** to swap OSRM → self-hosted or Mapbox once the stub is implemented.

**Stop:** Phase 1 complete; do not expand dispatch ranking or Mapbox in the same PR as Phase 2.
