# 09 — Data, State and Source of Truth

Diagram source: [`diagrams/data-and-source-of-truth.mmd`](diagrams/data-and-source-of-truth.mmd)

---

## 1. Where state lives

| Kind | Location | Durable? | Notes |
|---|---|---|---|
| Relational | **Supabase PostgreSQL 17** — 112 tables | Yes | The only store of record |
| Object storage | Supabase Storage, bucket `profiles` (public, 5 MB, image MIME allowlist) | Yes | Profile images, dish images, delivery proof |
| Identity | Supabase `auth.users` | Yes | Mirrored into 4 profile tables by `user_id` |
| Sessions | Supabase Auth cookies in the browser | Semi | JWT re-verified server-side on every request |
| Realtime | Supabase Realtime channels | No | Transport only, never state |
| Rate-limit counters | Upstash Redis **or** per-instance `Map` | No | Ephemeral by design |
| Geocode cache | module-level `Map` in `geocoding.service.ts` | No | **Unbounded, never evicted, per-lambda** |
| Tax-rate cache | 60 s in-memory in `TaxConfigService` | No | Falls back to constants |
| Maintenance-flag cache | 30 s in-memory in `apps/web/src/middleware.ts` | No | Fails open |
| Supabase admin client | module-level singleton | No | Reused across requests in a warm lambda |
| Payment records | **Stripe** | Yes, external | Charges, refunds, transfers, payouts, customers |
| Sent messages | **Resend / Twilio** | Yes, external | |
| Local dev DB | Docker Postgres :54322 | Yes, local | `supabase start` |
| CI artifacts | `test-results/`, `playwright-report/` | No | gitignored |

**There is no message queue, no event store, no cache tier, no search index, and no read replica.** Every durable fact is a row in one PostgreSQL database.

## 2. The 112 tables by domain

| Domain | Tables |
|---|---|
| **Identity & platform** (8) | `customers`, `chef_profiles`, `drivers`, `platform_users`, `platform_settings`, `platform_accounts`, `admin_notes`, `audit_logs` |
| **Chef & storefront** (10) | `chef_storefronts`, `chef_kitchens`, `chef_availability`, `chef_delivery_zones`, `chef_documents`, `chef_payout_accounts`, `chef_payouts`, `storefront_state_changes`, `service_areas`, `favorites` |
| **Catalog** (8) | `menu_items`, `menu_categories`, `menu_item_options`, `menu_item_option_values`, `menu_item_availability`, `menu_item_packaging`, `menu_item_recipe_versions`, `packaging_items` |
| **Customer** (7) | `customer_addresses`, `carts`, `cart_items`, `reviews`, `push_subscriptions`, `notifications`, `support_tickets` |
| **Order** (9) | `orders`, `order_items`, `order_item_modifiers`, `order_status_history`, `order_exceptions`, `order_pack_checks`, `checkout_idempotency_keys`, `domain_events`, `sla_timers` |
| **Delivery & driver** (13) | `deliveries`, `delivery_assignments`, `delivery_events`, `delivery_tracking_events`, `assignment_attempts`, `driver_presence`, `driver_locations`, `driver_documents`, `driver_vehicles`, `driver_shifts`, `driver_earnings`, `driver_payout_accounts`, `driver_notification_preferences` |
| **Money** (12) | `ledger_entries`, `payout_runs`, `payout_adjustments`, `driver_payouts`, `instant_payout_requests`, `refund_cases`, `stripe_events_processed`, `stripe_reconciliation`, `promo_codes`, `promo_code_usages`, `loyalty_accounts`, `loyalty_transactions` |
| **Referral** (2) | `referral_codes`, `referral_signups` |
| **Partner** (4) | `api_partners`, `api_partner_keys`, `partner_webhook_deliveries`, + view `partner_api_stats` |
| **Kitchen OS — recipes & costing** (6) | `recipes`, `recipe_versions`, `recipe_ingredients`, `recipe_steps`, `recipe_cost_snapshots`, `kitchen_daily_summaries` |
| **Kitchen OS — inventory** (8) | `inventory_items`, `inventory_stock_movements`, `inventory_counts`, `inventory_count_lines`, `inventory_waste_events`, `inventory_alerts`, `storage_locations`, `receiving_batches` |
| **Kitchen OS — supply** (5) | `suppliers`, `supplier_items`, `supplier_price_history`, `purchase_orders`, `purchase_order_lines` |
| **Kitchen OS — production** (7) | `production_batches`, `production_batch_inputs`, `production_batch_outputs`, `prep_tasks`, `prep_task_events`, `kitchen_tickets`, `kitchen_ticket_items` |
| **Kitchen OS — labour & stations** (9) | `kitchen_staff`, `kitchen_shifts`, `kitchen_stations`, `kitchen_station_assignments`, `kitchen_ticket_events`, `kitchen_queue_entries`, `time_entries`, `labor_allocations`, `labor_cost_snapshots`, `pay_periods` |
| **Ops** (4) | `ops_processor_runs`, `ops_override_logs`, `system_alerts`, `analytics_events` |

Views: `order_status_events`, `partner_api_stats`.

> **There is no `announcements` table.** `/api/announcements` and `/dashboard/announcements` fan an announcement out into per-user rows in `notifications` via `listAnnouncementAudienceUserIds` + `insertNotifications`. An announcement therefore has no canonical record of its own and cannot be edited, recalled or re-sent after the fact. VERIFIED — `apps/ops-admin/src/app/api/announcements/route.ts`.

## 3. Source-of-truth matrix

| Entity / state | Authoritative owner | Writers | Readers | Replicas & caches | Conflict rule | Evidence |
|---|---|---|---|---|---|---|
| Order lifecycle | `orders.engine_status` | **`MasterOrderEngine` only** (design rule) | all 4 apps | `orders.status` legacy mirror | `ORDER_TRANSITION_MAP`; invalid → `InvalidTransitionError` | `master-order-engine.ts`, `order-state-machine.ts` |
| Order money snapshot | `orders.{subtotal,delivery_fee,service_fee,tax,tip,total}` | `runCheckout` (once, at creation) | everything downstream | Stripe PI `amount` | Webhook **asserts equality to the cent** and refuses on mismatch | `run-checkout.ts`, webhook `stripePaymentAmountCents` |
| Delivery lifecycle | `deliveries.status` | `DeliveryEngine`, `DispatchOrchestrator` | driver, ops, customer tracking | order status mirror via `syncFromDelivery` | `DELIVERY_TRANSITION_MAP` | `delivery-engine.ts` |
| Driver offer | `assignment_attempts.response` | `OfferManagementService` | dispatch board | — | `expires_at`; sweep by processor | migration `00007` |
| Driver presence | `driver_presence` | driver app, every 15 s | `DriverMatchingService` | — | **90 s TTL — stale = invisible** | `driver-matching.service.ts` |
| **Money** | `ledger_entries` | `LedgerService` **only** | finance UI, reconciliation, exports | Stripe | `uq_ledger_entries_idempotency_key`; key = `{entryType}:{sourceId}` | migration `00019` |
| Payment | **Stripe** (external) | Stripe | webhook → ledger | `orders.payment_status`, `stripe_events_processed` | Stripe wins; `ReconciliationService` is the bridge — **unscheduled, R-02** | `reconciliation.service.ts` |
| Payout run | `payout_runs` | `PayoutService` | finance UI | — | `payout_runs_one_processing_per_type` partial unique index | migration `00032` |
| Checkout de-dup | `checkout_idempotency_keys` | `runCheckout` | `runCheckout` | — | `UNIQUE(customer_id, idempotency_key)`; stale `processing` reclaimable after 120 s | migration `00018` |
| Webhook de-dup | `stripe_events_processed` | both webhooks | both webhooks | — | Claim-or-skip on `stripe_event_id` | migration `00016`, `00037` |
| Processor run | `ops_processor_runs` | `sla`, `expired-offers` **only** | `/api/engine/health` | — | `unique(processor_name, idempotency_key)` | migration `00023` |
| Identity | Supabase `auth.users` | Supabase Auth | all | `customers`/`chef_profiles`/`drivers`/`platform_users` by `user_id` | Auth wins; FKs validated in `00034`/`00038` | migrations `00034`, `00038` |
| Platform roles | `platform_users.role` | ops team management (`team_manage` = super-admin) | `getOpsActorContext` | — | Unmapped role → `null` actor → denied | `packages/engine/src/server.ts: roleMap` |
| Partner identity | `api_partner_keys` (SHA-256 hashes) | ops | `resolvePartnerContext` | — | Hash lookup; env `PARTNER_API_KEY` is a legacy anonymous fallback | `apps/web/src/lib/partner/auth.ts` |
| Tax & fee rates | `platform_settings.{hst_rate,service_fee_percent}` | ops (`platform_settings` = super-admin) | `TaxConfigService` | 60 s in-memory | DB wins; constants on failure | `tax-config.service.ts` |
| Maintenance flag | `platform_settings.setting_value.maintenance_mode` | ops | `apps/web` middleware | 30 s in-memory | **Fails open** | `apps/web/src/middleware.ts` |
| **Inventory on hand** | **`inventory_stock_movements` (signed sum)** | chef-admin routes | Kitchen OS | **`inventory_items.current_quantity` — explicitly a cache** | Ledger wins by design; **no job enforces it** | `inventory.engine.ts: computeOnHand` |
| Recipe cost | `recipe_cost_snapshots` | costing service | P&L, menu costing | `recipes.*` current | Snapshot is point-in-time | migration `00055` |
| Loyalty | `loyalty_accounts` + `loyalty_transactions` | `LoyaltyService` from webhook | account UI | — | Real orders only; test orders excluded | `loyalty.service.ts` |
| Audit | `audit_logs` | `AuditLogger` | `audit_timeline_read` capability | — | Append-only | `core/audit-logger.ts` |

## 4. Traced data flows

### 4.1 Primary business transaction
`cart_items` → `buildCheckoutQuote` → `orders` + `order_items` → Stripe PI metadata → `stripe_events_processed` → `orders.payment_status` → kitchen queue → `deliveries` → `ledger_entries` → `payout_runs`/`payouts`.

### 4.2 Authentication and session
Browser credentials → Supabase Auth → JWT cookie → `middleware` `getUser()` → actor resolver reads `customers` / `chef_profiles` (+`chef_storefronts`, `chef_kitchens`) / `drivers` / `platform_users` **via the admin client** → `ActorContext { userId, role, entityId }` → capability guard.

### 4.3 Background / scheduled
Vercel Cron → processor → `ops_processor_runs` claim → `sla_timers`, `orders`, `deliveries`, `system_alerts` → `events.flush()` → `domain_events`. **Gated by R-01.**

### 4.4 External integration
Partner POST → `api_partner_keys` (hash) → `materializePartnerOrder` creates guest `customers` + `customer_addresses` + `carts` → `runCheckout` → order stamped `partner_id`/`is_test` → `partner_webhook_deliveries` → outbound HMAC webhook.

### 4.5 Error / retry / recovery
Failure → `catch` → `cancelOrder` → `checkout_idempotency_keys.status='failed'` → customer retry allowed. Webhook failure → `finalizeStripeWebhookFailure` → 500 → Stripe retries → idempotency claim short-circuits duplicates.

### 4.6 Administrative action
Ops UI → route → `getOpsActorContext` → `guardPlatformApi` → `OperationsCommandGateway.execute(command)` → Zod validation → orchestrator → `audit_logs` + `ops_override_logs`.

### 4.7 Analytics / reporting
`analytics_events`, `kitchen_daily_summaries`, `driver_earnings`, `ledger_entries` → `OpsAnalyticsService` → `/api/analytics`, `/api/analytics/trends`, `/api/export`, `/dashboard/reports`.

## 5. Lifecycle, retention and deletion

| Concern | Finding | Status |
|---|---|---|
| Retention policy | **No `DELETE`-on-schedule job, no TTL, no partitioning, no archival table anywhere in the migrations.** Every row ever written is kept forever. | VERIFIED |
| Growth-critical tables | `driver_locations`, `delivery_tracking_events`, `analytics_events`, `domain_events`, `audit_logs`, `sla_timers`. `driver_locations` grows at ~4 rows/min per online driver. | VERIFIED |
| Right-to-erasure | No customer-deletion or anonymisation routine exists in the API surface. | VERIFIED |
| PII lockdown | Migration `00049_review_pii_column_lockdown_and_rls_enforcement` restricts PII columns on reviews — evidence of deliberate attention in at least one place. | VERIFIED |
| Backup | `docs/BACKUP_AND_ROLLBACK.md` exists; **nothing in the repository configures, schedules, or tests a backup or a restore.** | UNKNOWN — U-04 |
| Migration safety | Forward-only. `CLAUDE.md` records that editing an applied migration in place once caused a production incident (commit `a6c72f6c`). | VERIFIED |
| Cross-system reconciliation | `ReconciliationService` (Stripe↔ledger) exists but is **unscheduled** (R-02). Inventory cache↔movement ledger has **no reconciliation at all** (F-14). | VERIFIED |

## 6. Consistency model

Single PostgreSQL instance, so **strong consistency within a request**. Beyond that:

- **No cross-table transactions across service calls.** `runCheckout` performs order creation, an order update, a Stripe API call and an idempotency update as separate operations. A crash between them is handled by the compensating `catch`, not by a transaction. This is a deliberate, correctly-implemented saga.
- **Read-your-writes** holds (one primary, no replicas).
- **Idempotency, not locking, is the concurrency primitive** — unique indexes on `checkout_idempotency_keys`, `ledger_entries.idempotency_key`, `ops_processor_runs`, plus the partial unique index on `payout_runs`.
- **Realtime is at-most-once.** A dropped WebSocket loses updates; every consumer must be able to recover by re-fetching. Not a source of truth anywhere.

## 7. Sensitive-data classification

| Class | Where | Protection |
|---|---|---|
| Payment card data | **Never touches this system.** Card details go browser → Stripe directly. | By design |
| Customer PII (name, email, phone, address) | `customers`, `customer_addresses` | RLS + capability guards; `redactSensitiveForLog` on log paths |
| Driver PII + documents | `drivers`, `driver_documents` | RLS; migration `00039` restricts to ops read |
| Chef documents | `chef_documents` | RLS |
| Precise location history | `driver_locations`, `delivery_tracking_events` | RLS; **retained indefinitely** |
| Payout bank details | `chef_payout_accounts`, `driver_payout_accounts` | RLS; the actual bank data lives at Stripe |
| API keys | `api_partner_keys` — **stored as SHA-256 hashes**, never plaintext | Correct |
| Review PII | Locked down in migration `00049` | Correct |
