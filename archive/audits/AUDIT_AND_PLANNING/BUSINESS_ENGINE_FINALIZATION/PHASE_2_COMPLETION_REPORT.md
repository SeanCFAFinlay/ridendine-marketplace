# Phase 2 — Customer tracking + realtime privacy — completion report

**Date:** 2026-05-03  
**Scope:** Customer-safe `order:{orderId}` / `order_update` contract, sanitizer, web tracker + hook, driver location → server → public broadcast, API removal of raw driver coords for customers. **Phase 3 not started.**

## Phase 0 / Phase 1 gates

Read **`PHASE_0_COMPLETION_REPORT.md`** and **`PHASE_1_COMPLETION_REPORT.md`**: prior phases **PASS**; Phase 2 builds on `public_stage`, `EtaService.refreshFromDriverPing`, and delivery routing columns.

## Overall status: PASS (with notes)

| Area | Result | Notes |
|------|--------|--------|
| Engine: `broadcastPublic` / `broadcastDriverOffer` | **PASS** | Whitelist + `sendBroadcastOnce` subscribe/send; tests added. |
| Sanitizer | **PASS** | `public-broadcast-sanitizer.ts` + unit tests. |
| Web: `useOrderStream`, tracker, map | **PASS** | No driver/chef pins; polyline + progress only. |
| Web: `GET /api/orders/[id]` | **PASS** | **`driverLocation` removed**; **`tracking`** safe snapshot added. |
| Driver: location POST + `deliveryId` | **PASS** | Ownership check, `refreshFromDriverPing`, `broadcastPublic`; hook POSTs `/api/location`. |
| Tests | **PASS** | `pnpm --filter @ridendine/engine test`, `@ridendine/web test`, `@ridendine/driver-app test`; full `pnpm test` run in validation. |
| Docs | **PASS** | `BUSINESS_ENGINE.md`, `APP_CONNECTIONS.md`, `ORDER_FLOW.md`. |

### WARN

- **`broadcastPublic`** depends on Supabase Realtime **subscribe → send** from the service client; misconfigured Realtime or keys may log errors without failing the HTTP location POST.
- **Non–driver-ping updates** (e.g. chef accept → `public_stage` = `cooking`) are **not** all wired to `broadcastPublic` yet; customers still rely on **poll fallback** (`/api/orders/[id]`) for those transitions until optional future hooks.
- **Generic `flush` domain-event broadcasts** to `entity:delivery:*` may still contain sensitive payloads for **non-customer** subscribers — customer web **must not** subscribe to those channels (Phase 2 tracker uses **`order:{id}`** only).

---

## Files created

| Path |
|------|
| `packages/engine/src/core/public-broadcast-sanitizer.ts` |
| `packages/engine/src/core/public-broadcast-sanitizer.test.ts` |
| `packages/engine/src/core/event-emitter.broadcast-public.test.ts` |
| `apps/web/src/lib/orders/use-order-stream.ts` |
| `apps/web/src/lib/orders/__tests__/use-order-stream.test.tsx` |
| `apps/driver-app/src/__tests__/location-route.test.ts` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_2_COMPLETION_REPORT.md` (this file) |

---

## Files modified (high level)

| Path | Change |
|------|--------|
| `packages/engine/src/core/event-emitter.ts` | `broadcastPublic`, `broadcastDriverOffer`, `sendBroadcastOnce`. |
| `packages/engine/src/core/engine.factory.ts` | Expose **`eta`** on `CentralEngine`. |
| `packages/engine/src/core/index.ts` | Export sanitizer. |
| `packages/engine/src/core/event-emitter.test.ts` | Channel mock supports `subscribe` for typecheck. |
| `packages/engine/src/core/engine-factory.test.ts` | Assert `eta` present. |
| `apps/web/package.json` | `@ridendine/routing`; lint paths for `src/lib/orders`, `src/components/tracking`. |
| `apps/web/src/app/api/orders/[id]/route.ts` | Remove `driverLocation`; add **`tracking`**; extend delivery select. |
| `apps/web/src/app/orders/[id]/confirmation/page.tsx` | Pass `public_stage`, ETAs, polyline, progress to tracker; review gate uses `public_stage`. |
| `apps/web/src/components/tracking/live-order-tracker.tsx` | `useOrderStream`, four-stage UI, safe map props. |
| `apps/web/src/components/tracking/order-tracking-map.tsx` | Polyline + progress + ETA; no markers. |
| `apps/web/__tests__/tracking/live-order-tracker.test.tsx` | Rewritten for new contract. |
| `apps/driver-app/src/app/api/location/route.ts` | `deliveryId` ownership, `refreshFromDriverPing`, `broadcastPublic`; response without lat/lng echo. |
| `apps/driver-app/src/hooks/use-location-tracker.ts` | POST `/api/location` with optional `deliveryId`. |
| `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx` | Pass `deliveryId` on customer leg. |
| `docs/BUSINESS_ENGINE.md` | Realtime privacy contract section. |
| `docs/APP_CONNECTIONS.md` | Customer realtime + driver flow. |
| `docs/ORDER_FLOW.md` | Customer stream subsection. |

---

## Realtime contract implemented

| Item | Detail |
|------|--------|
| Channel | `order:{orderId}` via `orderChannel()` from `@ridendine/db`. |
| Event | `order_update` (broadcast). |
| Payload | Only: `public_stage`, `eta_pickup_at`, `eta_dropoff_at`, `route_progress_pct`, `route_remaining_seconds`, `route_to_dropoff_polyline`. |

---

## Privacy sanitizer behavior

- **`sanitizePublicOrderBroadcastPayload`**: whitelist-only output.
- **`stripSensitiveCoordinateKeys`**: used for **`broadcastDriverOffer`** shallow payloads (Phase 3 prep).

---

## Customer tracker behavior

- **`useOrderStream`**: subscribes to `order:{orderId}`; applies `order_update`; starts **interval polling only** when subscription reports `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`.
- **`LiveOrderTracker`**: `public_stage`–first four-step UI + cancelled/refunded terminals; map only for **`on_the_way`**; progress bar + `OrderTrackingMap` with **polyline / progressPct / etaDropoffAt** only.

---

## Driver location behavior

- **`useLocationTracker`**: sends **`deliveryId`** when on **picked_up** / **en_route_to_dropoff** / **arrived_at_dropoff**.
- **`POST /api/location`**: rejects **`deliveryId`** not owned by driver (**403**); on customer leg runs **`engine.eta.refreshFromDriverPing`**, then **`engine.events.broadcastPublic`** with sanitized fields; success body is **`{ recordedAt }`** only (no coordinate echo).

---

## Tests added / updated

- Engine: `public-broadcast-sanitizer.test.ts`, `event-emitter.broadcast-public.test.ts`; `event-emitter.test.ts` mock updated.
- Web: `use-order-stream.test.tsx`, `live-order-tracker.test.tsx` rewritten.
- Driver: `location-route.test.ts`.

---

## Commands run

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ridendine/engine test
pnpm --filter @ridendine/web test
pnpm --filter @ridendine/driver-app test
```

### Summary

- **Typecheck:** PASS after fixing recursive channel mock typing in engine tests.
- **Lint:** run with `pnpm lint` (turbo scoped app lint tasks).
- **Tests:** engine **413**, web **60**, driver **8**; full `pnpm test` executed in session.

### Errors encountered and fixed

- Engine `tsc`: implicit `any` on self-referencing channel mocks → **fixed** with `makeChannel()` / `mockImplementation` patterns.
- Web Jest: duplicate text queries for step labels / cancelled → **fixed** with `getAllByText` / exact terminal copy.

---

## Risks

1. **Realtime authorization:** anyone who knows a UUID could subscribe to `order:{uuid}` if Realtime permissions are open; tighten with **private channels** or **server-signed** access in a later hardening pass.
2. **Stale UI** for non–driver-driven transitions until **`broadcastPublic`** is called from order lifecycle code or postgres triggers.
3. **OSRM / ETA** quality unchanged from Phase 1; public broadcast only forwards stored/computed safe fields.

---

## Exact recommendation for Phase 3

1. **Dispatch:** implement ranked offers; call **`broadcastDriverOffer(driverId, attempt)`** from dispatch when sending offers (payload without coordinates; TTL / attempt metadata only).
2. **Optional:** emit **`broadcastPublic`** from a single post-transition hook (or DB webhook) whenever `orders.public_stage` or delivery ETAs change so customers reduce reliance on polling.
3. **Realtime hardening:** move customer order channel to **private** broadcast with RLS-aligned auth if product requires hiding order IDs from unauthenticated clients.

**Stop:** Phase 2 complete — no dispatch refactor, no finance changes.
