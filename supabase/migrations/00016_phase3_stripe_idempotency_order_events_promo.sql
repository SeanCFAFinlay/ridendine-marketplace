-- ==========================================
-- Phase 3 — Database / schema foundation
-- IRR-008: durable Stripe webhook idempotency store (schema only; app wiring Phase 4/9)
-- IRR-009: compatibility view order_status_events → order_status_history
-- IRR-029: document canonical promo columns (sync trigger already in 00010)
-- Does not modify prior migrations.
-- ==========================================

-- ==========================================
-- 1. STRIPE WEBHOOK IDEMPOTENCY (IRR-008)
--    No full payload stored; optional payload_hash for integrity/dedup metadata.
-- ==========================================

CREATE TABLE IF NOT EXISTS stripe_events_processed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  livemode BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processing_status TEXT NOT NULL DEFAULT 'processed'
    CHECK (processing_status IN ('processed', 'failed', 'duplicate_skipped')),
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  related_payment_id UUID NULL,
  payload_hash TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stripe_events_processed_stripe_event_id_key UNIQUE (stripe_event_id)
);

COMMENT ON TABLE stripe_events_processed IS
  'Stripe webhook idempotency ledger: one row per unique stripe_event_id. Inserts should use ON CONFLICT DO NOTHING or check-before-insert from server (Phase 4/9).';

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_event_type
  ON stripe_events_processed(event_type);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_processed_at
  ON stripe_events_processed(processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_related_order
  ON stripe_events_processed(related_order_id);

ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated: service_role (admin client) bypasses RLS for webhook handler.

-- ==========================================
-- 2. ORDER STATUS NAMING (IRR-009)
--    Physical table remains order_status_history; view for product/SQL alias only.
-- ==========================================

CREATE OR REPLACE VIEW order_status_events AS
SELECT * FROM order_status_history;

COMMENT ON VIEW order_status_events IS
  'Compatibility view (Phase 3): alias for order_status_history. Prefer order_status_history in new SQL; use this view where product language expects "events".';

-- ==========================================
-- 3. PROMO CODES — canonical documentation in DB (IRR-029)
--    Column sync: migration 00010 trigger sync_promo_code_fields on promo_codes.
-- ==========================================

COMMENT ON COLUMN promo_codes.starts_at IS
  'Canonical promo validity start (IRR-029). Kept in sync with valid_from by trigger sync_promo_code_fields (00010).';

COMMENT ON COLUMN promo_codes.expires_at IS
  'Canonical promo validity end (IRR-029). Kept in sync with valid_until by trigger sync_promo_code_fields (00010).';

COMMENT ON COLUMN promo_codes.usage_limit IS
  'Canonical max redemptions (IRR-029). Kept in sync with max_uses by trigger sync_promo_code_fields (00010).';

COMMENT ON COLUMN promo_codes.usage_count IS
  'Canonical redemption count (IRR-029). Kept in sync with times_used by trigger sync_promo_code_fields (00010).';

COMMENT ON COLUMN promo_codes.is_active IS
  'Canonical active flag for promo_codes (IRR-029).';

COMMENT ON COLUMN promo_codes.discount_type IS
  'Canonical: percentage | fixed (IRR-029). Application uses discount_value for amount/percent.';

COMMENT ON COLUMN promo_codes.discount_value IS
  'Canonical discount magnitude (IRR-029); interpretation depends on discount_type.';

COMMENT ON COLUMN promo_codes.valid_from IS
  'Alias column (00010); prefer starts_at for new writes.';

COMMENT ON COLUMN promo_codes.valid_until IS
  'Alias column (00010); prefer expires_at for new writes.';

COMMENT ON COLUMN promo_codes.max_uses IS
  'Alias column (00010); prefer usage_limit for new writes.';

COMMENT ON COLUMN promo_codes.times_used IS
  'Alias column (00010); prefer usage_count for new writes.';
