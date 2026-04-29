# Recommendations & Backlog

_Generated: 2026-04-28 · Auditor: Claude Code_

## Quick Wins (< 1 day, low risk)

### QW-1: Extract PasswordStrength to shared UI package
**Findings:** [[FND-001]]
**Components:** [[CMP-058]], [[CMP-059]]
**Effort:** S

Move `apps/web/src/components/auth/password-strength.tsx` to `packages/ui/src/components/password-strength.tsx`. Delete the copy in chef-admin. Update imports in both apps. This eliminates exact-duplicate code and prevents future drift.

### QW-2: Extract hardcoded Hamilton coordinates to shared constant
**Findings:** [[FND-013]]
**Components:** [[CMP-055]], [[CMP-062]]
**Effort:** S

Create a `DEFAULT_MAP_CENTER` constant in `packages/utils/src/geo.ts` or `packages/engine/src/constants.ts`. Replace all hardcoded `[43.2557, -79.8711]` references in map components across web, ops-admin, and driver-app.

### QW-3: Fix delivery_events column name in DispatchEngine
**Findings:** [[FND-004]]
**Components:** [[CMP-008]]
**Effort:** S

In `packages/engine/src/orchestrators/dispatch.engine.ts` line ~734, change the insert key from `data` to `event_data` to match the actual `delivery_events` table schema. The RPC was fixed in migration 00010 but direct inserts still use the wrong name.

### QW-4: Guard notification insert against null user_id
**Findings:** [[FND-018]]
**Components:** [[CMP-006]]
**Effort:** S

In `OrderOrchestrator.submitToKitchen()` around line 412, wrap the notification insert in an `if (chefUserId)` guard. The `notifications.user_id` column is NOT NULL, so inserting with null will throw a DB error.

### QW-5: Consolidate engine client wrappers
**Findings:** [[FND-016]]
**Components:** [[CMP-064]], [[CMP-065]], [[CMP-066]], [[CMP-067]]
**Effort:** S

The 4 `src/lib/engine.ts` files in each app share the same singleton pattern. Move to `packages/engine/src/client.ts` and re-export from the package. Each app imports and configures with its actor context getter.

---

## Consolidation (duplicate merges, shared extraction)

### CON-1: Unify schema definitions — eliminate triple-defined tables
**Findings:** [[FND-002]], [[FND-003]]
**Effort:** M

Create a single authoritative migration that defines each table once. The current situation with `promo_codes`, `driver_locations`, `chef_payout_accounts`, and `platform_settings` defined in multiple migrations with different column types is a maintenance hazard. Write a consolidation migration that:
1. Drops and recreates tables in canonical form
2. Migrates any existing data
3. Documents the canonical column types

### CON-2: Extract OpsRepository orchestration logic to engine
**Findings:** [[FND-007]]
**Components:** [[CMP-038]]
**Effort:** M

Move driver scoring algorithms, coverage gap calculations, and dispatch queue orchestration from `packages/db/src/repositories/ops.repository.ts` (616 LOC) into appropriate engine orchestrators. The repository should only contain data access queries — business logic belongs in the engine layer.

### CON-3: Split OrderOrchestrator into focused modules
**Findings:** [[FND-008]]
**Components:** [[CMP-006]]
**Effort:** L

The 1348-LOC OrderOrchestrator handles creation, payment, kitchen submission, acceptance, rejection, preparation, readiness, cancellation, completion, and ops override. Split into:
- `OrderCreationService` — createOrder, authorizePayment, submitToKitchen
- `OrderStatusMachine` — acceptOrder, rejectOrder, startPreparing, markReady
- `OrderCompletionService` — completeOrder, cancelOrder
- `OrderOpsService` — opsOverride, getAllowedActions

### CON-4: Split DispatchEngine and extract driver scoring
**Findings:** [[FND-009]]
**Components:** [[CMP-008]]
**Effort:** L

The 1310-LOC DispatchEngine should be split:
- `DriverMatchingService` — findEligibleDrivers, selectBestDriver, calculateDriverAssignmentScore
- `OfferManagementService` — acceptOffer, declineOffer, processExpiredOffers
- `DispatchOrchestrator` — requestDispatch, updateDeliveryStatus (thin coordinator)

---

## Structural Fixes (circular deps, layer violations)

### STR-1: Add automated SLA processor
**Findings:** [[FND-005]], [[FND-014]]
**Components:** [[CMP-004]], [[CMP-008]]
**Effort:** L

The SLA system and expired offer processing are currently manual-trigger only. Implement one of:
- **Option A:** Supabase Edge Function on a cron schedule (every 60s) that calls `processExpiredOffers()` and checks SLA timers
- **Option B:** Vercel Cron Job hitting an internal API endpoint
- **Option C:** pg_cron extension in Supabase for database-level scheduling

This is the single highest-impact structural fix — without it, delivery offers expire silently and SLA breaches go undetected.

### STR-2: Add Stripe void/cancel calls for rejected/cancelled orders
**Findings:** [[FND-017]]
**Components:** [[CMP-006]]
**Effort:** M

OrderOrchestrator.rejectOrder() and cancelOrder() write ledger entries for payment voids but never actually call `stripe.paymentIntents.cancel()`. The money is authorized on the customer's card but never released. Add actual Stripe API calls or wire through the CommerceLedgerEngine.

### STR-3: Align RLS policies with expanded role set
**Findings:** [[FND-020]]
**Components:** Platform-wide
**Effort:** M

Several RLS policies still reference the original `ops_admin` role while the engine uses `ops_agent`, `ops_manager`, and `finance_admin`. Audit all RLS policies across migrations and ensure they cover the full role set from migration 00010's CHECK constraint.

---

## Risk Reduction (security, testing)

### RISK-1: Add CI/CD pipeline with test gates
**Findings:** [[FND-011]], [[FND-012]]
**Effort:** L

Create `.github/workflows/ci.yml` with:
- TypeScript type checking (`pnpm typecheck`)
- ESLint (`pnpm lint`)
- Unit tests (engine package)
- Build verification (`pnpm build`)

### RISK-2: Add test coverage for critical paths
**Findings:** [[FND-012]]
**Effort:** L

Priority test targets:
1. All API route handlers (currently 1 of ~55 has tests)
2. Repositories — at least OrderRepository, DeliveryRepository
3. Auth middleware
4. Stripe webhook handler (security-critical)
5. Engine orchestrators (8 test files exist but coverage unknown)

### RISK-3: Implement email/SMS notification delivery
**Findings:** [[FND-006]]
**Components:** [[CMP-005]], [[CMP-049]]
**Effort:** M

The notification infrastructure exists (templates, sender, DB records) but no messages actually reach users. Integrate Resend (API key already in .env.example) for email delivery. Add SMS via Twilio for driver notifications (time-sensitive delivery offers).

### RISK-4: Remove or protect BYPASS_AUTH
**Findings:** [[FND-019]]
**Effort:** S

Either remove the BYPASS_AUTH env var entirely, or add a build-time check that fails if BYPASS_AUTH=true and NODE_ENV=production.
