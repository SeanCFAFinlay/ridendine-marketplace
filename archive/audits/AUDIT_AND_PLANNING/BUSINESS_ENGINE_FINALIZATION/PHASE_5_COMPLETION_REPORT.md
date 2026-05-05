# Phase 5 — Ledger, payouts, finance, reconciliation — completion report

**Date:** 2026-05-02  
**Scope:** Phase 5 only (no Phase 6). Phases 0–4 read as **PASS** — work proceeded.

## Overall status: **PASS** (with WARN)

| Area | Result | Notes |
|------|--------|--------|
| LedgerService + idempotency | **PASS** | All payables / refunds / payout debits / instant fee via `ledger_entries`; keys `${entry_type}:${source}` or scoped refund/payout keys. |
| PayoutService | **PASS** | `payout_runs.run_type` aligned to DB (`chef` / `driver`); `chef_payouts.amount` stored in **cents** (schema); run status `failed` when partial failures. |
| ReconciliationService | **PASS** | Daily scan + `stripe_reconciliation` upsert; unmatched rows get `variance_cents` and notes (not silent). |
| Ops API + crons | **PASS** | Payout preview/execute/instant/reconciliation routes; cron handlers use `validateEngineProcessorHeaders` (`CRON_SECRET`); `vercel.json` schedules added. |
| Finance UI (ops-admin) | **PASS** | Overview subnav + accounts, payouts, instant queue, reconciliation, refunds pages. |
| Driver instant UX | **PASS** | `/settings`, earnings balance + optional instant request + `/api/payouts/instant`. |
| Tests | **PASS** | New engine unit tests + migration contract for `00020`. |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | **PASS** (exit 0) | Full turbo + recursive tests (2026-05-03). |

### WARN

- **`packages/db` generated types** do not yet include `platform_accounts`, `stripe_reconciliation`, `instant_payout_requests`, etc. Ops-admin and driver-app use **`adminLoose()`** (`any`) or narrow casts until `pnpm db:generate` is run against a DB that includes migrations `00019` / `00020`.
- **Account drilldown URL shape:** Next.js cannot serve both static `accounts/chefs` and dynamic `accounts/[type]/[id]` for `/accounts/chefs/:id` without a conflict; drilldown is implemented as **`accounts/chefs/[id]`** and **`accounts/drivers/[id]`** sharing `account-detail-content.tsx` (spec’s single `[type]/[id]` file replaced by this routing-safe split).
- **`chef_payouts` ↔ `payout_runs`:** `chef_payouts` has no `payout_run_id` FK; run detail relies on **ledger `metadata.payout_run_id`** for traceability.
- **Stripe execution:** Instant / batch payouts record ledger debits; **actual Stripe Transfer / Payout API** execution is still an integration step for Phase 6+.

### FAIL

- None for Phase 5 gate.

---

## Files created

| Path |
|------|
| `packages/engine/src/services/ledger.service.ts` |
| `packages/engine/src/services/payout.service.ts` |
| `packages/engine/src/services/reconciliation.service.ts` |
| `packages/engine/src/services/ledger.service.test.ts` |
| `packages/engine/src/services/payout.service.test.ts` |
| `packages/engine/src/services/reconciliation.service.test.ts` |
| `supabase/migrations/00020_ledger_entries_order_optional.sql` |
| `apps/ops-admin/src/lib/admin-loose.ts` |
| `apps/ops-admin/src/app/api/cron/payouts-chef-preview/route.ts` |
| `apps/ops-admin/src/app/api/cron/payouts-driver-preview/route.ts` |
| `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` |
| `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts` |
| `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts` |
| `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts` |
| `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts` |
| `apps/ops-admin/src/app/api/engine/reconciliation/route.ts` |
| `apps/ops-admin/src/app/dashboard/finance/_lib/roles.ts` |
| `apps/ops-admin/src/app/dashboard/finance/_components/FinanceSubnav.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/_components/FinanceAccessDenied.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/accounts/account-detail-content.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/[id]/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/[id]/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/accounts/chefs/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/accounts/drivers/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/payouts/[runId]/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/instant-payouts/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx` |
| `apps/ops-admin/src/app/dashboard/finance/refunds/page.tsx` |
| `apps/driver-app/src/app/settings/page.tsx` |
| `apps/driver-app/src/app/settings/settings-client.tsx` |
| `apps/driver-app/src/app/api/payouts/instant/route.ts` |
| `AUDIT_AND_PLANNING/BUSINESS_ENGINE_FINALIZATION/PHASE_5_COMPLETION_REPORT.md` (this file) |

---

## Files modified (non-exhaustive)

| Path | Change summary |
|------|------------------|
| `packages/engine/src/core/engine.factory.ts` | Wired `ledger`, `payoutAutomation`, `reconciliation`. |
| `packages/engine/src/index.ts` | Exported ledger / payout / reconciliation services. |
| `packages/engine/src/core/engine-factory.test.ts` | Asserts new engine properties. |
| `packages/engine/src/orchestrators/order.orchestrator.ts` | `completeOrder` uses `LedgerService` for capture + payables (+ tip). |
| `packages/db/src/schema/phase0-business-engine.migration.test.ts` | Contract for `00020`. |
| `apps/ops-admin/vercel.json` | Crons: chef preview (weekly), driver preview (daily), reconciliation (daily). |
| `apps/ops-admin/package.json` | Lint globs: `api/cron`, `dashboard/finance`, `src/lib`. |
| `apps/ops-admin/src/app/dashboard/finance/page.tsx` | Subnav + shared access denied import. |
| `apps/driver-app/src/app/api/driver/route.ts` | PATCH `instant_payouts_enabled`. |
| `apps/driver-app/src/app/earnings/page.tsx` | Loads `platform_accounts` balance + instant flag. |
| `apps/driver-app/src/app/earnings/components/EarningsView.tsx` | Balance + instant payout UI. |
| `apps/driver-app/src/app/profile/components/ProfileView.tsx` | Link to payout settings. |

---

## Ledger behavior

- **Order completion:** `customer_charge_capture`, `tax_collected`, then `chef_payable`, `driver_payable`, `platform_fee` (+ optional `tip_payable`) with idempotent keys per order (and driver metadata on driver lines).
- **Refunds:** Negative mirror lines keyed by `refund:${refundSourceId}:…:${orderId}`.
- **Payouts:** Negative `chef_payable` / `driver_payable` with idempotency `chef_payable_payout_debit:${runId}:${payee}` (and driver equivalent); `order_id` nullable (`00020`).
- **Instant fee:** Fee as negative `driver_payable`; reversal entry on principal failure.

---

## Payout behavior

- **Chef / driver runs:** Preview from `platform_accounts`; execute inserts `payout_runs`, ledger debits, then `chef_payouts` / `driver_payouts`.
- **Instant:** 1.5% fee (`instantFeeCents`); `requestInstantPayout` inserts queue row; `executeInstantPayout` posts fee + principal debit; failure reverses fee and marks request `failed`.

---

## Reconciliation behavior

- **`runDaily`:** For each `stripe_events_processed` row in the UTC day window, match `ledger_entries` by `stripe_id` or by `order_id` + capture/refund entry types; **upsert** `stripe_reconciliation` (`matched` / `unmatched`, notes on variance).
- **`resolveManual`:** Sets `manual_resolved`, optional `ledger_entry_ids`, notes include actor user id (no FK to `platform_users` on `resolved_by`).

---

## UI routes (ops-admin)

- `/dashboard/finance` — overview (existing + `FinanceSubnav`).
- `/dashboard/finance/accounts/chefs`, `/accounts/drivers`, `/accounts/chefs/[id]`, `/accounts/drivers/[id]`.
- `/dashboard/finance/payouts`, `/dashboard/finance/payouts/[runId]`.
- `/dashboard/finance/instant-payouts`, `/dashboard/finance/reconciliation`, `/dashboard/finance/refunds`.

---

## Commands run

```bash
pnpm typecheck
pnpm lint
pnpm test
```

**Errors during validation:** Resolved (ops-admin strict `from()` table names; unused import in instant GET route; driver PATCH typing; Button `variant`).

---

## Risks

- Regenerate **Supabase types** soon to remove `adminLoose` / loose client usage.
- **Stripe money movement** not fully automated in this phase (ledger-first is in place).
- **Reconciliation** depends on `related_payment_id` / `related_order_id` population on `stripe_events_processed`.

---

## Exact recommendation for Phase 6

1. **Regenerate `database.types.ts`** from Supabase after applying `00019`/`00020`, then delete `adminLoose()` and type all `from('platform_accounts' | …)` calls.  
2. **Stripe Connect / Transfers:** Implement real Transfer/Payout calls for chef/driver/instant paths; persist `stripe_transfer_id` / `stripe_payout_id` on payout rows; extend webhooks to finalize states.  
3. **Schema:** Add `payout_run_id` (nullable FK) to `chef_payouts` for symmetric traceability with `driver_payouts`.  
4. **Risk / idempotency:** Wire `risk.engine` (Phase 4 note) ahead of payment mutations; extend reconciliation to amount variance, not only presence.  
5. **Ops actions:** Server actions or secured mutations from finance UI for `resolve_manual` / instant execute (today: API-first).

**Stop:** Phase 6 not started beyond the recommendations above.
