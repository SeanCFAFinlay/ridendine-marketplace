# Payment and finance ledger flow (Phase 9)

**Apps:** `apps/web` (checkout + Stripe webhook), `apps/ops-admin` (CSV export).  
**Authority:** `@ridendine/engine` (`orders`, `commerce`, `platform`, ledger writers) + Postgres.

---

## Source of truth

| Concern | Owner |
|---------|--------|
| **Stripe API version** | `packages/engine/src/services/stripe.service.ts` — `STRIPE_API_VERSION`, `getStripeClient()` (IRR-007). |
| **Payment authorization / capture** | Engine `order.orchestrator` + Stripe PaymentIntents; web checkout route creates PI via `getStripeClient()`. |
| **Money ledger** | `ledger_entries` — written by engine on checkout, refunds, payouts (see `commerce.engine`, `order.orchestrator`, `platform.engine`). |
| **Webhook idempotency** | `stripe_events_processed` — **one row per `stripe_event_id`**; claim (`processing`) → handler → `processed` or `failed` (IRR-008). |
| **Webhook transport** | `POST /api/webhooks/stripe` — signature verify first; **no business logic before successful claim** (except signature). |

---

## Webhook flow (IRR-008)

1. **Verify** Stripe signature (`constructEvent`).  
2. **Claim** `claimStripeWebhookEventForProcessing(admin, { stripeEventId: event.id, ... })`.  
   - If **`skip_already_processed`** or **`skip_in_flight`** → respond **200** `{ received: true, idempotentReplay: true }` — **no duplicate side effects**.  
   - If **`failed`** row exists → row reset to **`processing`** and handler **re-runs** (Stripe retry after 500).  
3. **Dispatch** by `event.type` (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, …).  
4. **Finalize** `finalizeStripeWebhookSuccess` or on thrown error `finalizeStripeWebhookFailure` + **500** so Stripe retries when processing failed.

**Caveats**

- Idempotency store is **Postgres** — correct under single-DB concurrency; multi-region webhooks still dedupe on `stripe_event_id`.  
- **`submitToKitchen`** failure after payment: still marked **processed** (same as pre–Phase 9); ops recovers from order state — document only.  
- **RiskEngine** checkout wire (IRR-022): engine exports `evaluateCheckoutRisk`; route hook can be added when product agrees on **failed-order** cleanup on block.

---

## Ops reconciliation export

| GET | Role / guard | Output |
|-----|----------------|--------|
| `/api/export?type=ledger&start=&end=` | `finance_export_ledger` | `ledger_entries` CSV |
| **`/api/export?type=stripe_events&start=&end=`** | **`finance_export_ledger`** | **`stripe_events_processed`** CSV (webhook audit / replay triage) |

Other export types remain `ops_export_operational`.

---

## Tests

- **Engine Vitest:** `packages/engine/src/services/stripe-webhook-idempotency.test.ts` — claim/skip/resume/finalize.  
- **Stripe CLI replay:** manual — replay same `evt_*`; second delivery should return **`idempotentReplay`**.

---

## Related docs

- [`docs/API_FOUNDATION.md`](API_FOUNDATION.md) — Stripe + webhook patterns.  
- [`docs/DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) — `ledger_entries`, `stripe_events_processed`.  
- [`docs/DATABASE_MIGRATION_NOTES.md`](DATABASE_MIGRATION_NOTES.md) — Phase 3 table origin.

---

*Phase 9 — IRR-008 runtime + export; IRR-007/018 verified via shared `getStripeClient()`.*
