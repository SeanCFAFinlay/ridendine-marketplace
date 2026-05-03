# Business engine (ops-admin foundation)

This document describes the **central marketplace business engine** data contract after **Phase 0** (`supabase/migrations/00019_business_engine.sql`). Detailed order/delivery state machines remain in [`ORDER_FLOW.md`](ORDER_FLOW.md).

## Goals

- **Ops-admin** is the operational control plane: dispatch, finance, audit, SLA.
- Ridendine acts as the **payment merchant** for chefs, drivers, and customers; money movement is recorded in **`ledger_entries`** and summarized in **`platform_accounts`** (Phase 0 trigger).
- **Customer-facing** order progress uses **`orders.public_stage`** only — not raw GPS or internal engine substates.

## Customer-safe projection: `orders.public_stage`

| Value | Meaning (customer copy) |
|-------|-------------------------|
| `placed` | Order is in; payment / kitchen intake (awaiting chef or early pipeline). |
| `cooking` | Chef side: accepted through ready for pickup / dispatch assignment (no courier food leg yet). |
| `on_the_way` | Courier has the order (picked up → en route to customer). |
| `delivered` | Delivered / completed. |
| `cancelled` | Cancelled or failed paths surfaced as cancelled to the customer. |
| `refunded` | Refund pending / partial / full refund. |

**Derivation:** `public_stage` is computed **only** from `orders.engine_status` via trigger `orders_sync_public_stage_trg` calling `orders_public_stage_from_engine()`. Legacy **`orders.status`** is **not** removed and is **not** overwritten by this migration.

**TypeScript mirror:** `mapEngineStatusToPublicStage()` in `packages/types/src/public-order-stage.ts` **must match** the SQL function (comments cross-reference both).

## Privacy

- Phase 0 adds **routing cache columns** on `deliveries` (polylines, ETAs, `route_progress_pct`) for future customer **progress** UI.
- **Do not** send driver or chef live coordinates on public customer channels; Phase 2+ will use progress/ETA derived server-side.

## Routing & ETA (Phase 1 — `@ridendine/routing`)

### Provider contract

- **`RoutingProvider`** (`packages/routing/src/provider.ts`): `route(from, to) → Route`, `matrix(sources, targets) → DurationMatrix`.
- **`ProviderId`**: `"osrm"` \| `"mapbox"` (Mapbox is a **stub** until a later phase; it throws a clear “not implemented” error and requires no env vars).
- **`OsrmProvider`** is the default production path: public **OSRM** demo server `https://router.project-osrm.org` (no API key). This is **best-effort** only (rate limits, no SLA); timeouts and retries on **429 / 5xx** reduce flakiness but do not guarantee availability.

### Cached delivery columns (writes)

`EtaService` persists only onto **`deliveries`** (Phase 0 columns), never raw live coords to the customer web:

- **Pickup leg:** `route_to_pickup_polyline`, `route_to_pickup_meters`, `route_to_pickup_seconds`, `eta_pickup_at`
- **Dropoff leg:** `route_to_dropoff_polyline`, `route_to_dropoff_meters`, `route_to_dropoff_seconds`, `eta_dropoff_at`
- **Progress / meta:** `route_progress_pct`, `routing_provider`, `routing_computed_at`

### ETA lifecycle (engine hooks)

| Moment | Method | Purpose |
|--------|--------|---------|
| Order submitted to kitchen (post-flush) | `computeInitial(orderId)` | Pickup point (storefront / kitchen) → customer: initial dropoff route + `eta_dropoff_at`. |
| Driver assigned / manual assign (post-flush) | `computeFullOnAssign(deliveryId)` | Driver → pickup, pickup → dropoff; pickup + dropoff ETAs and polylines. |
| Delivery marked **picked up** | `computeDropLegOnPickup(deliveryId)` | Driver → dropoff leg refresh. |
| Driver location ping (server-side, not customer UI in Phase 1) | `refreshFromDriverPing(deliveryId, driverPos)` | Updates `route_progress_pct`, remaining seconds, `eta_dropoff_at`. |
| Dispatch ranking | `rankDrivers(deliveryId, candidates)` | Matrix (or per-route fallback) for ascending **seconds** sort. |

### Phase 2 (customer)

- Customer-facing surfaces may consume **`deliveries.route_progress_pct`** and **ETAs** derived server-side; they must **not** expose raw driver or chef coordinates.

## Realtime privacy contract (Phase 2)

### Channel + event

| Surface | Channel | Broadcast event | Payload rule |
|---------|---------|-----------------|---------------|
| Customer order tracking | **`order:{orderId}`** | **`order_update`** | **Whitelist only** via `sanitizePublicOrderBroadcastPayload()` in `packages/engine/src/core/public-broadcast-sanitizer.ts`. |

**Allowed keys:** `public_stage`, `eta_pickup_at`, `eta_dropoff_at`, `route_progress_pct`, `route_remaining_seconds`, `route_to_dropoff_polyline`.

**Never** include raw driver/chef/storefront coordinates or generic `location` / `position` blobs on this channel.

### Server APIs

- **`DomainEventEmitter.broadcastPublic(orderId, payload)`** (`packages/engine/src/core/event-emitter.ts`) sends the sanitized payload after driver progress refresh and other server-side updates.
- **`GET /api/orders/[id]`** (web) returns a **`tracking`** object with the same safe fields — **not** `driverLocation` (removed in Phase 2).
- **Driver `POST /api/location`** with **`deliveryId`** (customer leg only) runs **`EtaService.refreshFromDriverPing`**, then **`broadcastPublic`** so the customer stream updates without ever receiving lat/lng.

### Auto-dispatch & driver offers (Phase 3)

- **Channel:** `driver:{driverId}:offers` — **Events:** `offer` (new attempt), `offer_expired` (TTL elapsed). Legacy alias **`offer_update`** is still accepted on the emitter for compatibility, but dispatch uses **`offer`** / **`offer_expired`**.
- **`DomainEventEmitter.broadcastDriverOffer(driverId, payload, event?)`** strips coordinate-like keys before send; payloads carry **addresses, attemptId, deliveryId, expiresAt, payout/distance summaries** only.
- **`DispatchEngine`** (`packages/engine/src/orchestrators/dispatch.engine.ts`):
  - **`offerToNextDriver`** → ranks with **`EtaService.rankDrivers`**, inserts **`assignment_attempts`** (`pending`, `expires_at`), then **`broadcastDriverOffer`**.
  - **`respondToOffer`** / accept-decline → assigns driver, **`computeFullOnAssign`**, or chains next offer.
  - **`expireAttempt`** (cron processor) → `offer_expired` broadcast, then next driver or **`escalateToOps`** when **`max_offer_attempts`** (from **`service_areas`** overrides merged with platform settings) is exhausted.
  - **`escalateToOps`** → **`order_exceptions`** (`exception_type: ops_dispatch_required` for dispatch failures), **`delivery_events`** (`ops_dispatch_required`), **`system_alerts`**, audit log.
  - **`forceAssign`** / **`manualAssign`** → ops-only; **`force_assign`** API requires a **reason**; **`computeFullOnAssign`** + **`ops_override_logs`**.
- **Tuning:** active **`service_areas`** row (first match or optional future storefront link) overrides **`offer_ttl_seconds`** and **`max_offer_attempts`** when set.

## Ledger idempotency

- Column **`ledger_entries.idempotency_key`** (optional).
- Partial unique index **`uq_ledger_entries_idempotency_key`** prevents duplicate inserts when the key is set (e.g. `chef_payable:order_<uuid>`).

## `platform_accounts`

- Materialized balances updated by trigger **`ledger_entries_touch_platform_accounts_trg`** on `ledger_entries` INSERT.
- **`chef_payable`:** `owner_id` = ledger `entity_id` when `entry_type = 'chef_payable'` (today often **storefront** UUID).
- **`driver_payable`:** `owner_id` = `entity_id` or `metadata->>'driver_id'` for `driver_payable` / `tip_payable`.
- **`platform_revenue`:** single logical bucket; `owner_id` = sentinel `00000000-0000-0000-0000-000000000001` (`PLATFORM_ACCOUNT_SENTINEL_OWNER_ID` in types).

## `stripe_reconciliation`

- Links **`stripe_events_processed.stripe_event_id`** (unique) to matching **`ledger_entries`** IDs for finance reconciliation (Phase 5).
- RLS: finance / super_admin roles may insert/update; read for finance and ops roles (see migration).

## `service_areas`

- PostGIS **`GEOGRAPHY(POLYGON,4326)`** per area; optional **`dispatch_radius_km`**, **`offer_ttl_seconds`**, **`max_offer_attempts`** overrides.
- GIST index on **`polygon`**.
- Seed: one **Default launch area** if the table is empty (replace coordinates for your city in ops).

## Instant payouts (schema only in Phase 0)

- **`drivers.instant_payouts_enabled`** — driver opt-in flag.
- **`instant_payout_requests`** — queue rows (`pending` → `executing` → `executed` / `failed` / `cancelled`). Stripe execution is **Phase 5**.
- New ledger type: **`instant_payout_fee`** in `LedgerEntryType` (types package) for future fee lines.

## Ops live board (Phase 4)

- **Channel:** **`ops:live`** (`opsLiveBoardChannel()` in `@ridendine/db` → `packages/db/src/realtime/channels.ts`). Ops-admin **`useOpsLiveFeed`** subscribes on a **single** Realtime channel and attaches **`postgres_changes`** for **`orders`**, **`deliveries`**, **`driver_presence`**, and **`chef_storefronts`**, plus **`broadcast`** handlers reserved for **`ops.live.patch`** (table + record merge hints) and **`board.refresh`** (full snapshot refetch).
- **Initial snapshot:** **`GET /api/ops/live-board`** ( **`dashboard_read`** ) returns orders (with nested delivery + names), approved drivers + presence, active storefronts + chef display name, and engine **pressure** counts (exceptions, SLA breaches today, pending dispatch, escalations). Client state merges row updates **by id** with **monotonic `updated_at`** checks — no duplicate entities in UI maps; derived columns (driver load, chef active order count) are **computed** from that single state.
- **Internal map:** **`DeliveryMap`** on the dashboard board may show **driver pins** and full delivery geometry **only** inside ops-admin (not customer channels).
- **SLA badges (UI only):** Threshold-style flags in **`apps/ops-admin/src/lib/ops-sla.ts`** (`computeOrderSlaFlags`) — **not** persisted; engine/DB SLA timers remain authoritative for finance and audit.

## Migrations index

| Migration | Topic |
|-----------|--------|
| `00019_business_engine.sql` | Phase 0: `public_stage`, delivery routing columns, `platform_accounts`, `stripe_reconciliation`, `service_areas`, instant payouts, ledger idempotency, RLS. |
| `@ridendine/routing` | Phase 1: `RoutingProvider`, OSRM + Mapbox stub, polyline/progress helpers, `EtaService` + engine thin wrapper. |

## Regenerate types

After applying migrations:

```bash
pnpm db:generate
```

Committed `database.types.ts` may lag until Docker / `DATABASE_URL` is available — see [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).
