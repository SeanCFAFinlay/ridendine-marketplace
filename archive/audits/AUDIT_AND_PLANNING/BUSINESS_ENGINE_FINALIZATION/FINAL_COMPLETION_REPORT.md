# Business Engine Finalization — FINAL COMPLETION REPORT (Phase 6)

**Date:** 2026-05-03  
**FINAL STATUS:** **WARN** (production-grade hardening shipped; see remaining risks)

Phases **0–5** were read as **PASS** for dependency gating (Phase 5 includes a `### FAIL` section with **no failing rows** — narrative WARN only).

---

## Phase summary (0–6)

| Phase | Scope | Status |
|-------|--------|--------|
| 0 | Schema foundation, `public_stage`, `platform_accounts`, docs | PASS |
| 1 | Routing / `EtaService` | PASS |
| 2 | Customer-safe broadcast, driver ping | PASS |
| 3 | Dispatch ranking, service areas, overrides | PASS |
| 4 | Ops live board, SLA UI | PASS |
| 5 | Ledger, payouts preview/execute, reconciliation v1, finance UI | PASS (WARN: loose typing until Phase 6) |
| 6 | Stripe execution, strict typing, reconciliation hardening, webhooks, audit, risk gate, tests | **WARN** |

**WARN rationale:** Live Stripe behavior depends on Connect account state, idempotency under retries, and DB migration `00021` being applied in the target environment. Local `db:generate` may still lag full remote schema; **`packages/db/src/database.merged.ts`** supplements generated types until typegen runs against a DB with all migrations.

---

## Part A — DB types / `adminLoose` removal

- Ran **`pnpm run db:generate`** in **`packages/db`** (root `pnpm db:generate` delegates via turbo to the same script).
- Added **`packages/db/src/database.merged.ts`**: merges finance tables (`platform_accounts`, `stripe_reconciliation`, `instant_payout_requests`, `service_areas`) and Phase 6 columns (`drivers.*` extensions, `chef_payouts.payout_run_id`, `driver_payouts.stripe_payout_id`, `stripe_events_processed.stripe_amount_cents`, `stripe_reconciliation.variance_flagged`).
- **`createAdminClient`**, **`createServerClient`**, **`createBrowserClient`** now use merged `Database`; **`@ridendine/db`** exports `Database` from merged, `Tables`/`Enums` from generated.
- Removed **`apps/ops-admin/src/lib/admin-loose.ts`**; all usages replaced with **`createAdminClient()`** from **`@ridendine/db`**.

---

## Part B — Stripe execution (`payout.service.ts`)

- **Chef / driver batch:** `stripe.transfers.create` → on success **`ledger.recordPayout`** with **`stripeId`** → **`chef_payouts` / `driver_payouts`** row with **`stripe_transfer_id`** and **`payout_run_id`** (chef). On ledger/row failure after transfer: **`transfers.createReversal`** (best-effort) + audit hooks.
- **Instant:** fee ledger → **`stripe.payouts.create`** (`method: 'instant'`, **`stripeAccount`**) → principal ledger with **`stripeId`** → request **`executed`** + **`stripe_payout_id`**. Stripe failure: **`reverseInstantPayoutFee`**, request **`failed`**. If payout succeeds but principal ledger fails: **`failed`** + critical audit (manual reconciliation).
- **`createPayoutService(client, ledger, { audit, getStripe })`** wired from **`engine.factory`** (Stripe optional when key missing — returns typed errors instead of crashing).

---

## Part C — Webhooks

- **`apps/web/src/app/api/webhooks/stripe/route.ts`:** extended **`claimStripeWebhookEventForProcessing`** with **`relatedPaymentId`** + **`stripe_amount_cents`**; calls **`handleStripeFinanceWebhook`** for PI / refund / **transfer / payout** events; dedicated cases for **`transfer.created`**, **`payout.paid`**, **`payout.failed`**.
- **`apps/ops-admin/src/app/api/stripe/webhook/route.ts`:** optional finance-only endpoint; secret **`STRIPE_WEBHOOK_SECRET_OPS`** or fallback **`STRIPE_WEBHOOK_SECRET`**; same idempotency + **`handleStripeFinanceWebhook`** (no kitchen submit — web remains canonical for **`payment_intent.succeeded` → kitchen** when using the marketplace URL).

---

## Part D — Reconciliation hardening

- **`reconciliation.service.ts`:** compares **`stripe_amount_cents`** to ledger sums when both exist; detects “Stripe amount but zero ledger”; sets **`variance_cents`** and **`variance_flagged`** when **Δ ≥ 100**; notes on partial / missing snapshots.

---

## Part E — Schema (`00021_finance_hardening.sql`)

- **`chef_payouts.payout_run_id`** (+ index).
- **`driver_payouts.stripe_payout_id`** (+ indexes on transfer/payout ids).
- **`drivers.stripe_connect_account_id`**, **`drivers.payout_blocked`**.
- **`stripe_events_processed.stripe_amount_cents`** (+ index).
- **`stripe_reconciliation.variance_flagged`** (+ partial index).

---

## Part F — Audit timeline

- **`apps/ops-admin/src/lib/audit/timeline.ts`:** entity types + **`financeAuditTimelineTitle`** for payout / Stripe / reconciliation surfacing in ops UI.

---

## Part G — Risk engine (pre-finance gate)

- **`packages/engine/src/services/payout-risk.service.ts`:** validates balance, duplicate payout rows per run, chef Connect eligibility, driver Connect + flags + instant opt-in for instant path.

---

## Part H — Failure handling

- Payout paths: **try/catch** around Stripe; errors pushed to run **`errors[]`**, **`safeAudit`** for blocks/failures; instant + finance webhook handler wrapped to avoid throwing from **`handleStripeFinanceWebhook`** (errors audited).

---

## Part I — Tests

- **`packages/engine/src/services/stripe.integration.test.ts`:** reconciliation variance, mocked chef payout Stripe + ledger + **`chef_payouts`**, finance webhook transfer upsert.
- Web Jest mock extended for **`handleStripeFinanceWebhook`**.

---

## Validation (2026-05-03)

| Command | Result |
|---------|--------|
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS (turbo; ops-admin lint includes **`src/app/api/stripe`**) |
| `pnpm test` | PASS (recursive workspace) |

---

## Financial integrity validation

- Ledger payout debits carry **`stripe_id`** / metadata for settlement traceability.
- No **`chef_payouts` / `driver_payouts`** insert after successful transfer without ledger write order enforced (ledger immediately after Stripe success; reversal attempted if ledger fails).
- Instant path documents critical failure if Stripe payout succeeds but ledger principal fails.

---

## Stripe execution validation

- **`stripe.transfers.create`** and **`stripe.payouts.create`** invoked with idempotency keys and metadata where applicable.
- Requires **`STRIPE_SECRET_KEY`**, valid Connect accounts (**`chef_payout_accounts`**, **`drivers.stripe_connect_account_id`**), and Stripe API version pinned in **`stripe.service.ts`**.

---

## Reconciliation validation

- Daily job uses amount parity when **`stripe_amount_cents`** populated from webhook claim.
- **`handleStripeFinanceWebhook`** upserts **`stripe_reconciliation`** for listed event types.

---

## Audit coverage validation

- Payout blocks, Stripe errors, reversals, instant critical path, and finance webhook errors log through **`AuditLogger`** where **`audit`** is injected (engine factory).

---

## Remaining risks

1. **Dual webhook endpoints:** If both web and ops URLs receive the same event with the **same** signing secret, idempotency prevents double processing; if misconfigured with different secrets duplicated on one event ID, behavior depends on Stripe configuration — prefer **one** primary endpoint for PI + finance, or separate **event destinations** with distinct secrets and clear routing docs.
2. **Ledger after Stripe:** If DB is unavailable immediately after a successful transfer, reversal is attempted but operations must monitor **`chef_payout_reversal_failed`** audits.
3. **Instant principal failure after payout:** Funds may reach the connected account while the request is marked **`failed`** — requires manual reconciliation (audited).
4. **Driver batch payouts** require **`drivers.stripe_connect_account_id`** populated (migration added; data backfill is an ops task).

---

## Production readiness checklist

- [ ] Apply **`00021_finance_hardening.sql`** to production Supabase; re-run **`pnpm run db:generate`** against that project and confirm merged types can be trimmed if generated schema fully matches.
- [ ] Set **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`** (and optionally **`STRIPE_WEBHOOK_SECRET_OPS`** for ops-only URL).
- [ ] Stripe Dashboard: webhook URL(s), Connect onboarding for chefs and drivers, Instant Payouts capability where required.
- [ ] Backfill **`drivers.stripe_connect_account_id`** for any driver receiving batch or instant payouts.
- [ ] Monitor **`stripe_reconciliation`** rows with **`variance_flagged`**.
- [ ] Runbook for **`instant_payout_ledger_critical`** and reversal-failed audits.

---

## Stop after Phase 6

Per mission scope: **no Phase 7+ work in this pass.**
