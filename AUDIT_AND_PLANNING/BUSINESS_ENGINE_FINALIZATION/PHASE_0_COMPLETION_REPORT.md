# Phase 0 — Schema & contract foundation — completion report

**Date:** 2026-05-02  
**Scope:** Database + types + docs + tests only. **Phase 1 not started.**

## Overall status: PASS (with notes)

| Area | Result | Notes |
|------|--------|--------|
| Migration `00019_business_engine.sql` | **PASS** | Additive; preserves `orders.status`, `engine_status`. |
| Types (`PublicOrderStage`, etc.) | **PASS** | `@ridendine/types` exports + vitest. |
| Docs | **PASS** | `BUSINESS_ENGINE.md` + updates to schema / order flow / app connections. |
| Contract tests | **PASS** | `@ridendine/types` unit tests + `@ridendine/db` migration string contract tests. |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | **PASS** (exit 0) | Run 2026-05-02 after `pnpm install` — see **Commands run**. |
| `supabase db reset` | **WARN / N/A** | Not run here; requires local Docker + Supabase. Apply `00019` via `pnpm db:reset` or `supabase db push` when the stack is up. |

---

## Files created

| Path |
|------|
| `supabase/migrations/00019_business_engine.sql` |
| `packages/types/src/public-order-stage.ts` |
| `packages/types/src/public-order-stage.test.ts` |
| `packages/types/vitest.config.ts` |
| `packages/db/src/schema/phase0-business-engine.migration.test.ts` |
| `docs/BUSINESS_ENGINE.md` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_0_COMPLETION_REPORT.md` (this file) |

---

## Files modified

| Path |
|------|
| `packages/types/package.json` — `test` script + `vitest` devDependency |
| `packages/types/src/index.ts` — re-export `public-order-stage` |
| `packages/types/src/enums.ts` — `InstantPayoutStatus` |
| `packages/types/src/engine/index.ts` — `LedgerEntryType.INSTANT_PAYOUT_FEE` |
| `packages/types/src/domains/platform.ts` — `ServiceArea`, `InstantPayoutRequest`, `PlatformAccount` |
| `docs/DATABASE_SCHEMA.md` |
| `docs/ORDER_FLOW.md` |
| `docs/APP_CONNECTIONS.md` |

---

## Schema changes (summary)

### `orders`

- **`public_stage`** `TEXT NOT NULL` with `CHECK` in (`placed`, `cooking`, `on_the_way`, `delivered`, `cancelled`, `refunded`).
- **`orders_public_stage_from_engine(text)`** immutable SQL function.
- **`orders_sync_public_stage_trg`** `BEFORE INSERT OR UPDATE OF engine_status` → sets `public_stage`.
- Backfill: `UPDATE … SET public_stage = orders_public_stage_from_engine(engine_status) WHERE public_stage IS NULL`.
- Index: **`idx_orders_public_stage_created_at`** on `(public_stage, created_at DESC)`.

### `deliveries`

Routing / ETA cache (populated in Phase 1):  
`route_to_pickup_polyline`, `route_to_pickup_meters`, `route_to_pickup_seconds`, `eta_pickup_at`,  
`route_to_dropoff_polyline`, `route_to_dropoff_meters`, `route_to_dropoff_seconds`, `eta_dropoff_at`,  
`route_progress_pct`, `routing_provider`, `routing_computed_at`.

### New tables

- **`platform_accounts`** — `(account_type, owner_id)` unique; balance columns; RLS for finance/ops read.
- **`stripe_reconciliation`** — FK to **`stripe_events_processed(stripe_event_id)`** (table from `00016`; no alternate Stripe event table in repo).
- **`service_areas`** — `GEOGRAPHY(POLYGON,4326)`, tuning columns, GIST on `polygon`; conditional seed of default polygon if table empty.
- **`instant_payout_requests`** — driver queue; RLS driver select/insert own + ops/finance all.

### `drivers`

- **`instant_payouts_enabled`** `BOOLEAN NOT NULL DEFAULT false`.

### `ledger_entries`

- **`idempotency_key`** `TEXT` nullable.
- **Partial unique index** `uq_ledger_entries_idempotency_key` where key is not null.
- Expression indexes on `metadata->>'chef_id'` / `metadata->>'driver_id'` where keys exist.

### Triggers

- **`ledger_entries_touch_platform_accounts_trg`** `AFTER INSERT ON ledger_entries` — `SECURITY DEFINER`, updates **`platform_accounts`** for `chef_payable`, `driver_payable`, `tip_payable`, `platform_fee`.

---

## Tests added

| Test file | What it proves |
|-----------|------------------|
| `packages/types/src/public-order-stage.test.ts` | `mapEngineStatusToPublicStage` matches intended engine→public mapping; unknown → `placed`; mapping does not depend on legacy `orders.status`. |
| `packages/db/src/schema/phase0-business-engine.migration.test.ts` | Migration file contains required strings: `public_stage`, routing columns, `platform_accounts`, `stripe_reconciliation` + FK to `stripe_events_processed`, `service_areas` + GIST, idempotency index, `instant_payout_requests`, `instant_payouts_enabled`. |

**Not included (requires live Postgres):** SQL-level assertions that the trigger fires on `engine_status` updates and that duplicate `idempotency_key` inserts fail. Run after `supabase db reset` if desired.

---

## Commands run

Commands executed (repo root `C:\Users\sean\RIDENDINEV1`, 2026-05-02):

```text
pnpm install   → success
pnpm typecheck → success (turbo: 12 tasks)
pnpm lint      → success (turbo)
pnpm test      → success (exit code 0); includes:
  - @ridendine/types: 5 tests (public-order-stage.test.ts)
  - @ridendine/db: 7 tests (phase0-business-engine.migration.test.ts) + existing suites
```

Optional (not run in this session):

```bash
pnpm db:reset
pnpm db:generate
```

---

## Errors

- None from `pnpm install`, `typecheck`, `lint`, or `pnpm test`.
- `graphify` rebuild (`python3` / `py -3` + `graphify.watch`) was not confirmed on this Windows host; run locally if graphify is installed.

---

## Risks

1. **SQL ↔ TypeScript drift:** `orders_public_stage_from_engine()` and `mapEngineStatusToPublicStage()` must be edited together when engine statuses change.
2. **`platform_accounts` semantics:** `chef_payable.owner_id` follows ledger `entity_id` (often **storefront** UUID today). Finance UIs must document this until normalized to `chef_profiles.id` if desired.
3. **Default `service_areas` seed:** Toronto-bbox placeholder; replace for production launch region.
4. **`stripe_reconciliation` FK:** `ON DELETE CASCADE` from `stripe_events_processed` — deleting processed events removes reconciliation rows (usually acceptable for idempotency store retention policy).

---

## What Phase 1 should do next

1. Add **`@ridendine/routing`** (or equivalent) and **`EtaService`** to populate **`deliveries`** routing columns from OSRM (or chosen provider).
2. Wire engine lifecycle hooks (`submitToKitchen`, assign driver, pickup) to recompute ETAs and set **`routing_computed_at`**.
3. Optionally read **`service_areas`** for dispatch radius / offer TTL overrides before auto-dispatch (Phase 3).
4. Regenerate **`packages/db/src/generated/database.types.ts`** after migrations apply.
5. Begin customer realtime using **`public_stage`** + routing fields (Phase 2) — **still no raw lat/lng on public channels.**

---

## Sign-off

Phase 0 **schema & contract foundation** delivered as specified: additive migration, types, documentation, and automated tests that do not require a running database (plus migration contract tests in `@ridendine/db`).
