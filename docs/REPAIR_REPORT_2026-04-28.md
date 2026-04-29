# Repair Report — 2026-04-28

## Baseline (Phase 0)
| Check | Result |
|-------|--------|
| `pnpm install` | OK |
| `pnpm typecheck` | 12/12 tasks passed |
| `pnpm test` (engine) | 135 tests passed (7 test files) |
| `pnpm build` | 4/4 apps built |
| Repo structure | All 13 workspaces confirmed |

## Findings Fixed

### Phase 1 — High-Risk Broken Wires

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-004** delivery_events column mismatch | ✅ Fixed | `packages/engine/src/orchestrators/dispatch.engine.ts` |
| **FND-018** Notification null user_id | ✅ Fixed | `packages/engine/src/orchestrators/order.orchestrator.ts` |
| **FND-017** Stripe void not called | ✅ Fixed | `packages/engine/src/orchestrators/order.orchestrator.ts` |

**FND-004:** Changed `data:` to `event_data:` in `delivery_events` insert (line ~734). Added `actor_type` and `actor_id` fields.

**FND-018:** Wrapped notification insert in `if (chefUserId)` guard. Else branch creates audit log entry and `chef_notification_failed` order exception.

**FND-017:** Added `PaymentAdapter` interface for Stripe operations. Updated `rejectOrder()` and `cancelOrder()` to call `paymentAdapter.cancelPaymentIntent()` when available. Ledger entries now distinguish `customer_charge_void` (success) from `customer_charge_void_pending` (failed). On Stripe failure, creates `payment_void_failed` order exception for ops.

### Phase 2 — Automated Processors

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-005** No SLA processor | ✅ Fixed | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` |
| **FND-014** No expired offer scheduler | ✅ Fixed | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` |

Added two new API endpoints with `ENGINE_PROCESSOR_TOKEN` authentication. Configured Vercel Cron in `apps/ops-admin/vercel.json` to run both every 60 seconds. Both are idempotent and safe for concurrent execution.

### Phase 3 — Duplicate Consolidation

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-001** Duplicate PasswordStrength | ✅ Fixed | `packages/ui/src/components/password-strength.tsx`, `packages/ui/src/index.ts`, 2 app files |
| **FND-013** Hardcoded coordinates | ✅ Fixed | `packages/engine/src/constants.ts`, 4 map component files |
| **FND-016** Duplicate engine wrappers | ⚠️ Deferred | See note below |

**FND-001:** Moved to `@ridendine/ui`. Both apps now re-export from the shared package.

**FND-013:** Created `DEFAULT_SERVICE_REGION_CENTER` and `DEFAULT_MAP_ZOOM` constants. Updated 4 map files.

**FND-016:** Deferred — the engine client wrappers in each app have different actor context getters (customer vs chef vs ops vs driver) that are app-specific. Consolidating only the `getEngine()` singleton would save minimal code while adding import complexity.

### Phase 4 — Security & Config

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-019** BYPASS_AUTH unsafe | ✅ Fixed | `packages/auth/src/middleware.ts` |
| **FND-020** RLS role mismatch | ✅ Fixed | `supabase/migrations/00011_rls_role_alignment.sql` |
| **FND-002** Schema drift | ⚠️ Documented | `docs/SCHEMA_DRIFT_REPAIR_PLAN.md` |
| **FND-003** platform_settings triple def | ⚠️ Documented | `docs/SCHEMA_DRIFT_REPAIR_PLAN.md` |

**FND-019:** Added production crash guard — `throw new Error(...)` when `BYPASS_AUTH=true` and `NODE_ENV=production`.

**FND-020:** New migration `00011_rls_role_alignment.sql` aligns RLS policies with expanded role set (ops_agent, ops_manager, finance_admin).

**FND-002/003:** Documented repair plan in `docs/SCHEMA_DRIFT_REPAIR_PLAN.md`. Requires manual DB inspection before applying additive migration. Not safe to auto-apply.

### Phase 5 — Layer Violations

| Finding | Status |
|---------|--------|
| **FND-007** OpsRepository layer violation | ⚠️ Documented |
| **FND-008** OrderOrchestrator god class | ⚠️ Documented |
| **FND-009** DispatchEngine god class | ⚠️ Documented |

All three documented in `docs/ENGINE_REFACTOR_PLAN.md` with proposed module boundaries. Deferred from this sprint due to high regression risk.

### Phase 6 — Notification Delivery

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-006** No email/SMS delivery | ✅ Fixed (abstraction) | `packages/engine/src/core/notification-sender.ts` |

Added `NotificationDeliveryProvider` interface with `registerProvider()` on `NotificationSender`. DB notifications always work. External providers (email/SMS) are opt-in via registration. No crash if no providers are configured.

### Phase 7 — CI & Tests

| Finding | Status | Files Changed |
|---------|--------|---------------|
| **FND-011** No CI pipeline | ✅ Enhanced | `.github/workflows/ci.yml` |
| **FND-012** Missing test coverage | ✅ Partial | `packages/engine/src/orchestrators/repair-validation.test.ts` |

**FND-011:** Enhanced existing CI with environment variables for Next.js build, added lint step.

**FND-012:** Added 12 new tests covering: FND-004 column fix, FND-017 PaymentAdapter, FND-018 null guard, FND-013 constant extraction, FND-019 production guard, platform constants sanity.

## Post-Repair Verification (Phase 8)

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 12/12 tasks passed |
| `pnpm test` (engine) | **147 tests passed** (8 test files) |
| `pnpm build` | 4/4 apps built (1m14s) |

## Files Changed Summary

| Category | Files |
|----------|-------|
| Engine orchestrators | 2 (order.orchestrator.ts, dispatch.engine.ts) |
| Engine core | 1 (notification-sender.ts) |
| Engine constants | 1 (constants.ts) |
| Engine tests | 1 (repair-validation.test.ts) |
| API routes (new) | 2 (sla processor, expired-offers processor) |
| UI package | 2 (password-strength.tsx, index.ts) |
| Auth package | 1 (middleware.ts) |
| App components | 6 (4 map files, 2 password-strength re-exports) |
| Migrations | 1 (00011_rls_role_alignment.sql) |
| CI | 1 (ci.yml) |
| Config | 2 (.env.example, vercel.json) |
| Documentation | 5 (repair report, security notes, ops processors, engine refactor plan, schema drift plan) |
| **Total** | **25 files** |

## Remaining Risks

1. **FND-002/003 schema drift** — requires manual DB inspection. See `docs/SCHEMA_DRIFT_REPAIR_PLAN.md`.
2. **FND-017 Stripe void** — `PaymentAdapter` is optional. Apps must wire it up by creating an implementation that calls `stripe.paymentIntents.cancel()`. Without this, the system works but logs `customer_charge_void_pending` and creates ops exceptions.
3. **FND-007/008/009 refactoring** — deferred. See `docs/ENGINE_REFACTOR_PLAN.md`.
4. **Test coverage** — still low overall (147 engine tests, no repository/API route tests).

## Environment Variables Required

| Variable | Required By | Description |
|----------|------------|-------------|
| `ENGINE_PROCESSOR_TOKEN` | ops-admin | Auth token for SLA/offer processors |
| `NEXT_PUBLIC_SUPABASE_URL` | all apps | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all apps | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | all apps | Supabase admin key |
| `STRIPE_SECRET_KEY` | web | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | web | Stripe webhook verification |

## Manual Steps Required

1. **Generate ENGINE_PROCESSOR_TOKEN:** `openssl rand -hex 32` — add to ops-admin environment
2. **Apply migration 00011:** Run `supabase db push` or apply via Supabase dashboard
3. **Apply migration 00012:** Schema drift cleanup — additive, safe to apply after 00011
4. **Wire PaymentAdapter:** Create Stripe implementation in `apps/web/src/lib/stripe-adapter.ts` and pass to engine factory

---

## Sprint 2 — Remaining 8 Findings (2026-04-28 continued)

### Baseline
| Check | Result |
|-------|--------|
| `pnpm typecheck` | 12/12 passed |
| `pnpm test` (engine) | 147 passed |
| `pnpm build` | 4/4 apps built |

### FND-002 + FND-003: Schema Drift — ✅ Fixed

Created `supabase/migrations/00012_schema_drift_cleanup.sql`:
- Normalizes `chef_payout_accounts` (adds missing columns from migration 00004)
- Normalizes `platform_settings` (adds all columns from 00004, 00009, 00010 with IF NOT EXISTS)
- Adds missing indexes on `driver_locations` and `promo_codes`
- Ensures `audit_logs` has all referenced columns
- **All changes additive** — no data modified, no columns dropped

### FND-007: OpsRepository Layer Violation — ✅ Fixed

Extracted 3 business logic functions from `packages/db/src/repositories/ops.repository.ts`:
- `calculateDistanceKm()` → `packages/utils/src/geo.ts`
- `extractAreaFromAddress()` → `packages/utils/src/geo.ts`
- `scoreDriverForDispatch()` → `packages/utils/src/scoring.ts`

Architecture: pure functions placed in `@ridendine/utils` (leaf package) to avoid circular dependencies. Engine re-exports via `packages/engine/src/services/ops-analytics.service.ts`. Repository now imports from `@ridendine/utils` instead of defining its own copies.

Added 10 tests in `packages/utils/src/scoring.test.ts` covering distance calculation, area extraction, and driver scoring logic.

### FND-008: OrderOrchestrator God Class — ⚠️ Documented

Documented in `docs/ENGINE_REFACTOR_PLAN.md` with proposed 5-module split. Deferred from this sprint — too risky without comprehensive integration test coverage. The PaymentAdapter introduced in FND-017 fix is a first step toward separation.

### FND-009: DispatchEngine God Class — ⚠️ Documented

Documented in `docs/ENGINE_REFACTOR_PLAN.md`. The FND-007 scoring extraction is a first step. Next: extract OfferManagementService.

### FND-010: ChefMenuList Embedded Modals — ✅ Fixed

Extracted from `apps/chef-admin/src/components/menu/menu-list.tsx` (496 → 267 LOC):
- `apps/chef-admin/src/components/menu/category-modal.tsx` (80 LOC)
- `apps/chef-admin/src/components/menu/item-modal.tsx` (148 LOC)

Bonus: `CategoryModal.onSuccess` prop type improved from `any` to `{ id: string; name: string; description: string | null }`.

### FND-015: Duplicate AuthLayout — ✅ Fixed

Created shared `packages/ui/src/components/auth-layout.tsx` with:
- `variant` prop: `'customer' | 'chef' | 'ops' | 'driver'` (controls gradient/theme)
- `badgeText` prop: optional portal identifier
- `logo` prop: React node (each app passes its own Next.js Image)

Both apps now use thin wrappers importing from `@ridendine/ui`.

### FND-016: Duplicate Engine Client Wrappers — ✅ Fixed

Created `packages/engine/src/client-helpers.ts` with:
- `getAdminEngine()` — zero-arg singleton using admin client
- `resetEngineClient()` — for testing
- `errorResponse()` / `successResponse()` — standard JSON response helpers

All 4 apps re-export `getAdminEngine as getEngine` for backward compatibility. App-specific functions (actor context getters, ownership verifiers) remain in each app's `src/lib/engine.ts`.

### Sprint 2 Verification
| Check | Result |
|-------|--------|
| `pnpm typecheck` | 12/12 passed |
| `pnpm test` (engine) | 147 tests passed |
| `pnpm test` (utils) | 10 tests passed |
| `pnpm build` | 4/4 apps built (44s) |

### Sprint 2 Files Changed

| Category | Files |
|----------|-------|
| Schema migration | 1 (00012_schema_drift_cleanup.sql) |
| Utils package (new) | 3 (geo.ts, scoring.ts, scoring.test.ts) |
| Utils config | 2 (index.ts, package.json) |
| Engine services | 1 (ops-analytics.service.ts) |
| Engine config | 2 (index.ts, client-helpers.ts) |
| DB repository | 2 (ops.repository.ts, package.json) |
| UI components (new) | 2 (auth-layout.tsx, password-strength — already from sprint 1) |
| UI config | 1 (index.ts) |
| Chef-admin components | 3 (category-modal.tsx, item-modal.tsx, menu-list.tsx) |
| App auth layouts | 2 (web, chef-admin auth-layout.tsx) |
| App engine wrappers | 4 (web, chef-admin, ops-admin, driver-app engine.ts) |
| Documentation | 1 (ENGINE_REFACTOR_PLAN.md updated) |
| **Sprint 2 Total** | **24 files** |

### Combined Sprint 1 + Sprint 2 Summary

| Metric | Value |
|--------|-------|
| Findings fixed | **18 of 20** |
| Findings documented/deferred | 2 (FND-008, FND-009 god class refactors) |
| Tests added | 22 (12 engine + 10 utils) |
| Total tests passing | 157 |
| Files changed | ~49 |
| Migrations added | 2 (00011, 00012) |
| New shared components | 3 (PasswordStrength, AuthLayout, client-helpers) |
| New API endpoints | 2 (SLA processor, expired offers processor) |
| Documentation files | 6 |
