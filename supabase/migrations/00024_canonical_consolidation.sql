-- ==========================================
-- 00024 — CANONICAL CONSOLIDATION (Phase 2 rebuild)
--
-- Idempotent and additive. No DROP statements, no UPDATEs touching live data.
--
-- Closes residual schema drift from FND-002 / FND-003 by:
--   1. Defensive re-application of 00012's ADD COLUMN IF NOT EXISTS
--      (cheap insurance against any deploy that bypassed 00012).
--   2. COMMENT ON COLUMN documentation marking the orphan KV columns
--      from 00010 (setting_key, setting_value, description) as
--      reserved-but-unused.
--
-- Safe to apply on an already-consolidated DB. Verified locally on a
-- fresh `supabase db reset` (2026-05-05) with all NOTICE-level
-- "column already exists, skipping" messages expected.
-- ==========================================

-- ----------------------------------------------------
-- Section A: defensive ADD COLUMN IF NOT EXISTS — platform_settings
-- (mirrors 00012; harmless on already-consolidated DB)
-- ----------------------------------------------------

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS platform_fee_percent              DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS service_fee_percent               DECIMAL(5,2)  DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS hst_rate                          DECIMAL(5,2)  DEFAULT 13.00,
  ADD COLUMN IF NOT EXISTS min_order_amount                  DECIMAL(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS dispatch_radius_km                DECIMAL(5,2)  DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS max_delivery_distance_km          DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS max_delivery_radius_km            DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS default_prep_time_minutes         INTEGER       DEFAULT 20,
  ADD COLUMN IF NOT EXISTS offer_timeout_seconds             INTEGER       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_assignment_attempts           INTEGER       DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_assign_enabled               BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS refund_auto_review_threshold_cents INTEGER      DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS support_sla_warning_minutes       INTEGER       DEFAULT 15,
  ADD COLUMN IF NOT EXISTS support_sla_breach_minutes        INTEGER       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS storefront_throttle_order_limit   INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storefront_throttle_window_minutes INTEGER      DEFAULT 30,
  ADD COLUMN IF NOT EXISTS storefront_auto_pause_enabled     BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS storefront_pause_on_sla_breach    BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_by                        UUID;

-- ----------------------------------------------------
-- Section B: defensive ADD COLUMN IF NOT EXISTS — chef_payout_accounts
-- ----------------------------------------------------

ALTER TABLE chef_payout_accounts
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_enabled        BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------
-- Section C: ensure exactly one platform_settings row exists
-- ----------------------------------------------------

INSERT INTO platform_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- ----------------------------------------------------
-- Section D: deprecation comments on orphan KV columns
-- (00010 introduced these for a never-completed key/value pattern;
--  the application uses the wide-row shape exclusively)
-- ----------------------------------------------------

COMMENT ON COLUMN platform_settings.setting_key IS
  'DEPRECATED: reserved from 00010 KV-store experiment. The canonical shape is the wide single row (platform_fee_percent, service_fee_percent, etc.). No application code reads or writes this column. Kept for backward compatibility; do not depend on it in new code.';

COMMENT ON COLUMN platform_settings.setting_value IS
  'DEPRECATED: reserved from 00010 KV-store experiment. See setting_key comment.';

COMMENT ON COLUMN platform_settings.description IS
  'DEPRECATED: reserved from 00010 KV-store experiment. See setting_key comment.';

COMMENT ON TABLE platform_settings IS
  'Platform configuration. Canonical shape: a single wide row (platform_fee_percent, service_fee_percent, hst_rate, min_order_amount, dispatch_radius_km, max_delivery_distance_km, default_prep_time_minutes, offer_timeout_seconds, max_assignment_attempts, auto_assign_enabled, refund_auto_review_threshold_cents, support_sla_warning_minutes, support_sla_breach_minutes, storefront_throttle_order_limit, storefront_throttle_window_minutes, storefront_auto_pause_enabled, storefront_pause_on_sla_breach). Read by packages/db/src/repositories/platform.repository.ts.';

-- ==========================================
-- DONE: schema is canonical and documented. Migration 00025 follows
-- with RLS helper functions and policy refactors.
-- ==========================================
