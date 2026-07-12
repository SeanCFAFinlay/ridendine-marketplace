# Chef Kitchen OS — Upgrade Log & Roadmap

Turning `apps/chef-admin` from an order dashboard into a full **Kitchen Operating
System**. Staged delivery with a verification gate per stage. The customer, ops,
and driver apps and the shared order engine must keep working at every step.

## Non‑negotiable rules

- **No order lifecycle change bypasses the engine/state machine.** UI/routes
  never mutate `orders.status` / `orders.engine_status` directly — all
  transitions go through the existing `PATCH /api/orders/[id]` action contract
  (`accept` / `start_preparing` / `mark_ready` / `reject` …).
- **Internal kitchen states are ticket‑level, not public order statuses.**
  (e.g. a future "packing" state must not become a public order status.)
- **No fake data.** Empty states and "needs setup" cards are fine; fabricated
  metrics are not.

## Kitchen ticket vs order status

- **Orders** are transaction truth (customer/payment/delivery). The Orders tab
  (`/dashboard/orders`) is now a **read‑only ledger** for history, search,
  trace and support — it does not run live service.
- **Kitchen Command** (`/dashboard/kitchen`) is the live operating surface
  (KDS, accept/prep/ready workflow, service controls, today's metrics).

## Delivered

### Stage 1 — Kitchen vs Orders split
- `components/orders/orders-ledger.tsx` — read‑only ledger: filters (search,
  kitchen status, payment status, delivery status, date range, issues‑only),
  columns (order #, customer, total, payment, kitchen status, delivery,
  created/ready/completed), CSV export, row → `/dashboard/orders/[id]`.
- `app/dashboard/orders/page.tsx` renders `OrdersLedger`.
- Removed the duplicate live‑workflow board (`orders-list.tsx`); the live
  workflow already exists in Kitchen Command's `kitchen-order-queue.tsx`.

### Stage 3 — Realtime ticket hydration
- **New API:** `GET /api/kitchen/tickets/[id]` — hydrates one kitchen ticket
  (items, modifiers via special instructions, customer, prep times, estimated
  ready), scoped to the authenticated chef's storefront (ownership check).
- `kitchen-order-queue.tsx` now fetches the fully hydrated ticket on every
  realtime INSERT/UPDATE, so a live ticket **never shows empty items**. Adds:
  - `confirmedById` + status‑rank reconciliation: a stale 30s poll cannot
    revert a confirmed optimistic transition or an in‑flight action.
  - one chime per new order; thin fallback only if hydration fails (poll
    repairs it within 30s).

### Stage 2 — Kitchen Command header (real metrics only)
- **New pure fn:** `computeServiceMetrics` in `lib/kitchen.ts` — active/new/
  in‑prep/ready/late counts, today's sales, today's **actual** average prep
  time, sold‑out / at‑daily‑limit items. Unit‑tested in `lib/__tests__/kitchen.test.ts`.
- `GET /api/kitchen/overview` now also returns `metrics`.
- **New component:** `components/kitchen/kitchen-command-header.tsx` — glanceable
  metric tiles + stock‑blocker card + **honest "needs setup" cards** for food /
  labour / prime cost (these stay un‑numbered until recipes (Stage 6) and
  labour (Stage 10) exist).

## Verification (run from repo root)

```bash
pnpm --filter @ridendine/chef-admin typecheck   # PASS
pnpm --filter @ridendine/chef-admin exec jest    # 17 suites / 107 tests PASS
```

Known pre‑existing repo issues (not introduced here): full `pnpm typecheck`
fails on a Supabase version drift in another package; `pnpm lint` reports
`no-require-imports` in test files and `db-boundary` warnings on raw `.from`
calls across the kitchen routes (existing convention).

## Roadmap (not yet built)

Stages 4–14 introduce **~40 new tables** (kitchen_tickets, recipes, inventory,
suppliers, production, labour, cost snapshots, daily summaries…), ~50 APIs and
6 engines. **Migration policy: author files only** into `supabase/migrations/`
starting at `00054_…` — never applied to the live Supabase automatically; the
owner runs `pnpm db:migrate`. Each new table needs RLS (chef sees only their
storefront; ops sees all; customers/drivers excluded) and Zod schemas in
`@ridendine/validation`. Recommended next stage: **Stage 5 — kitchen ticket
internal state** (unlocks packing column + close‑of‑day without touching public
order statuses).

## Ghost-Kitchen (multi-brand commissary) upgrade

Turning `apps/chef-admin` + `@ridendine/engine` into a **multi-brand
ghost-kitchen OS**: the commissary `chef_kitchen` runs many brand
`chef_storefronts` from one SHARED pool of inventory, suppliers, staff/labour
and production, with one KDS. Independent single-storefront chefs stay
onboardable and unchanged — this layer is additive.

**Scope rule:** shared-ops tables scope by `kitchen_id`; per-brand tables keep
`storefront_id`.
- Shared (`kitchen_id`): `kitchen_stations`, `storage_locations`,
  `inventory_items`, `inventory_stock_movements`, `inventory_counts`,
  `inventory_count_lines` (via parent), `inventory_waste_events`,
  `inventory_alerts`, `suppliers`, `supplier_items`, `purchase_orders`,
  `purchase_order_lines` (via parent), `receiving_batches`,
  `supplier_price_history`, `prep_tasks`, `prep_task_events`,
  `production_batches`, `production_batch_inputs`/`outputs` (via parent),
  `kitchen_staff`, `kitchen_shifts`, `time_entries`,
  `kitchen_station_assignments`.
- Per-brand (`storefront_id`): `recipes*`, `menu_*`, `packaging_*`, `orders`,
  `kitchen_tickets`, `kitchen_ticket_items`, `kitchen_daily_summaries`.
- Dual-scope (both): `labor_allocations`, `labor_cost_snapshots` — owned by the
  kitchen (RLS) but attributed to a brand storefront.

### Phase A — Re-scope + operator foundation (in progress)
Delivered so far (files authored; **owner must apply migrations**):
- **A.1 migrations re-scoped in place** (never-applied set, so edited directly,
  not a new forward migration): `00054` (`kitchen_stations`), `00056`
  (inventory), `00057` (suppliers/receiving), `00058` (production), `00059`
  (labour). `inventory_stock_movements` gained a `metadata` JSONB column +
  partial index `idx_inventory_movements_order` for Phase B brand-attribution &
  idempotent auto-decrement. Parent-scoped policies (`inventory_count_lines`,
  `purchase_order_lines`, `production_batch_*`) rewritten to reach `kitchen_id`
  through their parent. `00060` `kitchen_daily_summaries` intentionally left
  per-brand.
- **A.2 RLS** — `public.is_operator_of_kitchen(k_id)` added in `00055` (mirrors
  `is_chef_of_storefront` at kitchen level). `00054`'s station policy inlines the
  `chef_kitchens` join because the helper is defined one migration later. pgTAP
  `supabase/tests/rls/kitchen_scope.sql` proves cross-kitchen isolation, insert
  refusal, ops read-all, and non-owner denial via real `authenticated`-role RLS.
- **A.3 roles** — `packages/types/src/kitchen-capabilities.ts`
  (`KITCHEN_ROLES` operator/head_chef/line_staff + `KITCHEN_CAPS`), exported from
  the types barrel. Platform capability matrix untouched.
- **A.4 context** — `getOperatorKitchenContext()` in
  `packages/engine/src/server.ts` → `{ actor, kitchenId, storefrontId|null }`;
  active brand from validated `x-brand-id` header/cookie (spoof-safe: re-checked
  against `kitchen_id`). Re-exported via `apps/chef-admin/src/lib/engine.ts`.

**Owner action required before A.5/A.6 can be typecheck-verified:**
`pnpm db:migrate` on a fresh local DB, then `pnpm db:generate` (regenerates
`database.types.ts` with `kitchen_id`), then `supabase db reset` to run the
pgTAP. Remaining: **A.5** repoint chef-admin inventory/suppliers/PO/labour/
production routes + repositories + Zod schemas to `getOperatorKitchenContext` /
`kitchen_id`; **A.6** `KitchenScopeProvider` + `BrandSwitcher` + Kitchen-vs-Brand
nav split. Decisions locked: labour split = order-count share; payroll = Path A
export; billing = single Ridendine merchant, brands not partner-listed.

**A.5 — routes repointed (done, unverified until type regen).** All 26
chef-admin shared-ops routes under `api/{inventory,suppliers,purchase-orders,
labor,production}` now call `getOperatorKitchenContext` and filter/insert by
`kitchen_id`. Zod schemas needed no change (scope comes from context, not the
body). `getOperatorKitchenContext` added to the `audit:guards` APPROVED_GUARDS
allowlist → `pnpm audit:guards` passes (0 unguarded). Brand-scoped reads that
these routes legitimately keep on `storefront_id`: `orders`/`menu_items` in
`production/forecast` and `orders` in `labor/costs`.
- KNOWN Phase-C follow-up: `labor/costs` computes labour-vs-sales but labour is
  now kitchen-wide while its `orders` read is single-brand — the labour % is
  only meaningful once Phase C aggregates sales across the kitchen's brands. Left
  as-is (brand sales) for now; flagged, not fabricated.
- When no brand is active (`storefrontId` null), brand-scoped reads return empty
  rather than error — graceful "needs setup", consistent with no-fake-data.

**A.6 — kitchen scope UI (done).** `components/layout/kitchen-scope-provider.tsx`
(client context: kitchen, brands, active brand; `setActiveBrand` writes the
`x-brand-id` cookie + `router.refresh()`), `brand-switcher.tsx` (top-bar; hidden
for single-brand chefs, null for non-operators), `lib/kitchen-scope.ts` (server
loader; returns null → shell unchanged for independent chefs). `dashboard/layout`
now async, wraps the shell in the provider (never throws). Sidebar nav split into
Overview / **Kitchen** (shared: KDS, Inventory, Suppliers, Production, Labour,
Costs & P&L) / **Brand** (Orders, Menu, Recipes, Storefront, Hours, Reviews) /
Business, with the active brand shown on the Brand header.

**Verified now:** `@ridendine/types` + `@ridendine/engine` typecheck clean;
`audit:guards` passes. **Still blocked on owner:** `pnpm db:migrate` +
`pnpm db:generate` (chef-admin typecheck can't pass until `kitchen_id` is in the
generated types), `supabase db reset` (pgTAP). **Then remaining for ACCEPTANCE A:**
update the chef-admin jest route tests that assert `storefront_id` behaviour to
`kitchen_id`, and a small dev seed (1 kitchen → 2 brands, shared pool) to
exercise the two-brand isolation e2e.

**Dev seed (done).** `supabase/seeds/seed.sql` now makes the Every Bite Yum
kitchen a commissary running TWO brands — `every-bite-yum` +
`saigon-pho-house` (both under kitchen `aa000000-0001`, same operator) — plus a
shared inventory pool (5 items + opening-stock ledger), a shared supplier,
station, and two staff. Registered in `e2e/fixtures/test-data.ts` under
`ghostKitchen`. (Note: `saigon-pho-house` is a placeholder 2nd brand; rename once
the final 9 brand names are chosen.) There were no existing jest tests on the
re-scoped routes, so no route-test rewrite was needed.

### Phase B / C — pure engine cores (done & VERIFIED, DB wiring deferred)
Authored the money-critical math as pure, DB-free services with full vitest
coverage — runnable now, ready to wire once types regenerate:
- **B.3 auto-decrement core** — `services/inventory-consumption.service.ts`:
  `computeOrderStockConsumption` / `buildConsumeOrderMovements`. Given a completed
  order's lines + their active recipes, aggregates per-shared-item consumption
  (waste-grossed, per-portion via batch yield), brand-agnostic, signed via
  `signedMovementQuantity('consume_order', …)`. 10 tests incl. the shared-pool and
  "applied once decrements exactly / a second apply double-decrements → why the DB
  guard is required" properties.
- **C.1 labour allocation core** — `services/labor-allocation.service.ts`:
  `allocateLaborByOrderCount(total, brands)` = order-count share with
  largest-remainder whole-cent apportionment so per-brand amounts sum EXACTLY to
  the total (no drift, no invented pennies). 7 tests.
- **C.2/C.3 kitchen P&L core** — `services/kitchen-pnl.service.ts`:
  `allocateBySalesShare` (overhead by sales, exact cents) + `computeKitchenPnl`
  → per-brand contribution/food%/labour%/prime% and the kitchen rollup with
  prime-cost % vs a 60% target and best/worst brand. Brands with no recipe/labour
  data are `needsSetup` with null contribution — never zero-as-fact. 7 tests.
- Verified: `@ridendine/engine` typecheck clean; full engine vitest **1082
  passing** (24 new + no regressions).

### Phase B.3 — auto-decrement subscriber WIRED (done & verified)
`services/order-consumption.writer.ts` (`applyOrderStockConsumption`) loads a
completed order's lines → active `menu_item_recipe_versions` →
`recipe_ingredients`, runs the pure consumption core, writes `consume_order`
movements tagged `{ order_id, storefront_id }`, and keeps `current_quantity` in
step. Wired into `MasterOrderEngine.completeOrder` right beside the ledger
capture as a **best-effort, idempotent** side-effect (wrapped so it can never
undo a completed order). Idempotency is enforced in code (skip if the order
already has consume_order movements) AND by the DB backstop
`uq_inventory_movements_consume_order` (unique per order+item, partial on
`consume_order`) so a duplicate `order.completed` cannot double-decrement.
Verifiable now because the order engine uses the untyped Supabase client —
engine typecheck clean, all 33 order-engine tests still green (the completeOrder
ledger test exercises the graceful-failure path when the mock lacks inventory
tables).

### Phases B & C — route layer AUTHORED (verify after `pnpm db:generate`)
Built on the verified pure cores; these use the typed Supabase client so they
compile only after types regenerate, but are guarded (`audit:guards` 0 unguarded)
and correct-by-design:
- **B.1 multi-brand KDS** — `GET /api/kitchen/board` aggregates active
  `kitchen_tickets` across all brands under the kitchen, groups by station, tags
  each ticket with brand + colour; `/dashboard/kitchen/board` page (station
  columns, brand-coloured cards, 10s poll). Additive — per-brand overview
  untouched.
- **B.2 consolidated prep** — pure `consolidatePrepDemand` (3 tests) +
  `GET /api/production/plan/consolidated` (cross-brand demand → one ingredient
  prep sheet with contributing brands).
- **B.4 auto-reorder** — `POST /api/inventory/reorder` drafts one PO per
  preferred supplier at qty-back-to-par for low-stock items (operator submits
  before send); guarded + rate-limited + audit-logged.
- **C.2/C.3 P&L** — `GET /api/costs/pnl` (reuses costs/overview data gathering +
  verified `computeKitchenPnl`/`allocateLaborByOrderCount`) +
  `/dashboard/kitchen/pnl` page; sidebar "Costs & P&L" repointed.

**Still deferred:** C.1 labour-allocation WRITER cron (persists daily
`labor_allocations`; the P&L route allocates on-the-fly meanwhile, so this is
persistence/optimisation, not a blocker); realtime hydration on the KDS board
(poll for now); **Phase D** (payroll export, clone-a-brand, advisory AI). And the
owner-gated Phase A sign-off: `pnpm db:migrate && pnpm db:generate` (unblocks
chef-admin typecheck for every route above) + `supabase db reset` (pgTAP + seed).

### Phase D — payroll export + brand toolkit (built)
- **D.1 payroll (Path A export)** — migration `00061_pay_periods.sql` (kitchen-
  scoped `pay_periods` open→locked→exported, + a DB trigger
  `trg_block_locked_time_entries` that rejects edits/deletes of `time_entries`
  inside a locked/exported period — real freeze). Pure `payroll.service`
  (`computePayrollRun` + `payrollRunToCsv`): hours × snapshotted rate = gross,
  open shifts excluded, **no CPP/EI/tax** (provider withholds). 4 tests, verified.
  Routes: `GET`/`POST /api/labor/pay-periods`, `POST …/[id]/lock`,
  `GET …/[id]/export?format=csv|json` (marks exported, audit-logged).
- **D.2 clone-a-brand** — `POST /api/kitchen/brands/clone`: new storefront under
  the SAME kitchen (inactive until reviewed), optionally copying a template's
  menu categories/items, recipes + active versions + ingredients, and active
  recipe links — all FK-remapped, but `inventory_item_id` KEPT so the clone draws
  from the shared kitchen pool (no inventory duplicated). Packaging copy is a
  follow-up. Guarded + rate-limited + audit-logged.
- **D.3 advisory AI** — intentionally NOT built: optional, and autonomous AI over
  pay/inventory would violate the deterministic-over-AI non-negotiable.

Verified after D: engine typecheck clean, engine vitest **1089 passing** (31 new
across six pure cores), `audit:guards` 179 routes / 0 unguarded.
