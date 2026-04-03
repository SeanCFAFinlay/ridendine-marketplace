# RIDENDINE Have vs Need Structural Map

Last updated: 2026-04-03

This document records the current repo structure after the governance stabilization passes.
It is intentionally conservative: it describes what exists now, what is weak, and the minimum
missing pieces needed to keep the 4-app model stable without redesigning the product.

## Non-Regression Boundary

These behaviors are already repaired and must not regress:

- `ops-admin` owns chef approval, rejection, suspension, and storefront publish/unpublish.
- `chef-admin` cannot control marketplace visibility.
- `web` reads governed public storefront truth only.
- `ops-admin` finance reads real ledger, refund, and payout-adjustment data.
- chef governance actions terminate in shared `packages/engine` platform methods.
- storefront governance actions terminate in shared `packages/engine` platform methods.
- shared public storefront reads require approved chef plus active storefront.

## apps/web

### Have and working

- Customer-facing app shell, homepage, browse, storefront, cart, checkout, auth, and account routes exist.
- Public chef/storefront reads are centralized through shared db storefront helpers.
- Checkout and Stripe webhook write-paths already terminate in shared engine-owned payment failure/refund orchestration.
- Order/account tracking routes exist and build successfully.

### Have but structurally weak

- Some customer reads still happen directly in app code instead of shared read-model helpers.
- There are still two confirmation-style route surfaces:
  - `/order-confirmation/[orderId]`
  - `/orders/[id]/confirmation`
- Favorites/preferences/reorder convenience are not normalized into a clear shared read model.

### Missing and should exist

- Shared customer account/order-history read helpers for higher-value account pages.
- A documented canonical confirmation/tracking route.

### Where the missing pieces belong

- Shared customer/order read normalization: `packages/db`
- Route ownership/documentation: `docs/business-rules`
- Any UX-only route cleanup: `apps/web`

## apps/chef-admin

### Have and working

- Chef-only auth and dashboard surfaces exist.
- Storefront, menu, orders, payouts view, reviews, settings, and analytics routes exist.
- Storefront/menu core writes are already moved toward shared db logic.
- Chef storefront API rejects publication writes and preserves ops-admin governance.
- Chef prep/ready path already hands off orchestration to shared engine.

### Have but structurally weak

- Chef storefront/order/payout reads are still partly app-local instead of shared repo helpers.
- Payouts page is chef-scoped, but the data model behind chef finance visibility is still not fully normalized.
- Some chef dashboard pages still assemble domain-specific read models in app code.

### Missing and should exist

- Shared chef storefront summary helper.
- Shared chef payout summary helper based on real ledger/payable state.

### Where the missing pieces belong

- Shared chef reads: `packages/db`
- Any chef-owned workflow transitions: `packages/engine`
- Chef-only page rendering: `apps/chef-admin`

## apps/ops-admin

### Have and working

- Ops auth, dashboard, chefs, approvals, orders, deliveries, drivers, customers, support, settings, and finance routes exist.
- Engine-backed mutation surfaces already exist for:
  - order/delivery oversight
  - chef governance
  - storefront governance
  - refund/payout hold actions
- Finance page now renders real finance state instead of fabricated payout UI.
- Ops role gating exists through `getOpsActorContext()` and shared actor-role checks.

### Have but structurally weak

- Several ops-admin read surfaces still query Supabase directly instead of shared read helpers.
- Chef list, chef detail, approvals, finance summary context, customers, drivers, and support are not yet normalized around shared repository read models.
- There is still some split between legacy admin routes and engine-backed routes.
- Ops storefront governance depends on current schema conventions rather than a first-class typed storefront governance state.

### Missing and should exist

- Shared ops-facing read-model helpers for:
  - chef governance list/detail
  - storefront governance context
  - finance dashboard context where safe
  - driver/customer/support overview reads
- A single documented distinction between:
  - engine-backed mutation routes
  - read-model routes

### Where the missing pieces belong

- Shared ops read helpers: `packages/db`
- Shared governance/action orchestration: `packages/engine`
- Route composition and role gating: `apps/ops-admin`
- Ownership/reference docs: `docs/business-rules`

## apps/driver-app

### Have and working

- Driver-only routes exist for home, delivery detail, earnings, history, profile, and auth.
- Driver delivery completion now hands off order completion to shared engine.
- Delivery execution remains role-scoped.

### Have but structurally weak

- Driver read surfaces still rely heavily on app-local query composition.
- Driver earnings visibility is separate from ops-admin finance visibility and not yet normalized through shared helpers.

### Missing and should exist

- Shared driver dashboard/history/earnings read helpers.

### Where the missing pieces belong

- Shared driver reads: `packages/db`
- Driver-owned status transitions: `packages/engine`
- Driver UI composition: `apps/driver-app`

## packages/db

### Have and working

- Shared repositories exist for:
  - chefs
  - storefronts
  - menu
  - customers
  - orders
  - drivers
  - driver presence
  - deliveries
  - support
  - cart
  - addresses
  - promos
- Shared storefront reads now enforce approved chef plus active storefront.
- Shared chef listing/detail helpers now exist for governance context.

### Have but structurally weak

- No dedicated finance/payout repository layer yet.
- Some repos are still CRUD-oriented rather than read-model-oriented.
- High-value ops-admin reads are still incomplete in shared helpers.

### Missing and should exist

- Finance/payout repository helpers.
- Ops-facing aggregate helpers for chef/storefront/customer/driver/support contexts.

### Where the missing pieces belong

- `packages/db`

## packages/engine

### Have and working

- Central engine exists with modules for:
  - orders
  - kitchen
  - dispatch
  - commerce
  - support
  - platform
- Shared engine already owns:
  - mark ready -> dispatch handoff
  - delivered -> order completion handoff
  - payment failure/refund transitions
  - chef governance
  - storefront publish/unpublish
- Audit logging and domain event emission already exist.

### Have but structurally weak

- Older `services/*` logic still overlaps conceptually with orchestrators.
- Platform governance now exists, but some cross-domain governance methods are still split between engine and legacy route logic.
- Storefront governance is implemented against current schema conventions, not a first-class typed status field.

### Missing and should exist

- Continued migration away from duplicated legacy service logic where it overlaps engine ownership.
- A documented platform-governance surface that is clearly the write-path source of truth.

### Where the missing pieces belong

- `packages/engine`
- supporting docs in `docs/business-rules`

## docs/business-rules or equivalent

### Have and working

- Existing architecture and workflow docs exist under `docs/architecture`.
- Deployment mapping doc exists under `docs/deployment`.

### Have but structurally weak

- Current docs are broader architecture docs, not a tight business-rule layer tied to implemented ownership.
- There is no single place documenting current role ownership and current status semantics as implemented.

### Missing and should exist

- `docs/business-rules/role-ownership-matrix.md`
- `docs/business-rules/chef-status.md`
- `docs/business-rules/storefront-governance.md`
- `docs/business-rules/order-ownership.md`
- `docs/business-rules/finance-visibility.md`

### Where the missing pieces belong

- `docs/business-rules`

## deployment/config layout

### Have and working

- Workspace is split correctly with `pnpm-workspace.yaml`.
- Turbo build/typecheck/lint orchestration exists.
- Per-app `vercel.json` files exist for all 4 apps.
- Root-level chef-forcing `vercel.json` was already removed.

### Have but structurally weak

- Successful live isolation still depends on correct Vercel project/domain mapping outside the repo.
- `.vercel/` local linkage still points to one project at a time, which is normal but easy to misuse in a monorepo.

### Missing and should exist

- Explicit business-rule docs that tie domains to app ownership.
- Optional per-app deployment runbook commands in one place.

### Where the missing pieces belong

- `docs/business-rules`
- `docs/deployment`

## Highest-Value Structural Gaps To Tackle Next

1. Normalize the highest-value ops-admin read surfaces into shared `packages/db` helpers:
   - chef list
   - chef detail
   - approvals
   - storefront governance context
   - finance summary context where safe

2. Add business-rule docs that match the current code so future passes stop drifting.

3. Evaluate whether a first-class storefront governance status can be introduced safely.
   Current implemented truth is:
   - `chef_profiles.status` governs chef approval/suspension
   - `chef_storefronts.is_active` governs public storefront visibility
   This is functional now, but still a schema-level structural weakness.
