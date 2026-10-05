-- ============================================================================
-- 00063_partner_key_test_mode.sql
--
-- Per-KEY test mode.
--
-- Before this migration test mode lived only on api_partners.test_mode, so the
-- only way to give a live partner a staging key was to flip the WHOLE partner
-- into test mode — which would have taken their real orders out of the kitchen.
-- In practice that meant an `rdk_test_…` key issued to a live partner produced
-- fully LIVE orders: the `test_` prefix was cosmetic, nothing in the resolver
-- looked at it. A partner doing "just a staging smoke test" would have pushed a
-- real ticket to a real kitchen.
--
-- Effective test mode is now `api_partners.test_mode OR api_partner_keys.test_mode`.
-- The OR is deliberate and one-way: a key can only make a request MORE test-y,
-- never promote a test partner's traffic to live.
-- ============================================================================

BEGIN;

ALTER TABLE api_partner_keys
  ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN api_partner_keys.test_mode IS
  'Per-key test mode. Effective test mode = api_partners.test_mode OR this. Orders from a test key are recorded with orders.is_test = true and skip the live kitchen queue, finance, loyalty and payouts.';

-- Backfill: any key already minted with the rdk_test_ prefix was INTENDED as a
-- staging key, so make the prefix mean what it says.
UPDATE api_partner_keys
   SET test_mode = true
 WHERE key_prefix LIKE 'rdk_test_%'
   AND test_mode IS NOT TRUE;

-- Surface key-level test mode to operators alongside the partner-level flag.
DROP VIEW IF EXISTS partner_api_stats CASCADE;

CREATE OR REPLACE VIEW partner_api_stats AS
SELECT
  p.id,
  p.name,
  p.slug,
  p.is_active,
  p.test_mode,
  p.rate_limit_per_min,
  COUNT(o.id) FILTER (WHERE o.is_test IS NOT TRUE)                                   AS orders,
  COALESCE(SUM(o.total) FILTER (
    WHERE o.is_test IS NOT TRUE AND o.payment_status = 'completed'), 0)              AS revenue,
  MAX(o.created_at)                                                                  AS last_order_at,
  (SELECT MAX(k.last_used_at) FROM api_partner_keys k WHERE k.partner_id = p.id)     AS key_last_used_at,
  (SELECT COUNT(*) FROM api_partner_keys k
     WHERE k.partner_id = p.id AND k.is_active AND k.revoked_at IS NULL)             AS active_keys,
  (SELECT COUNT(*) FROM api_partner_keys k
     WHERE k.partner_id = p.id AND k.is_active AND k.revoked_at IS NULL
       AND k.test_mode)                                                              AS active_test_keys,
  (SELECT COUNT(*) FROM partner_webhook_deliveries d
     WHERE d.partner_id = p.id AND d.status = 'delivered')                          AS webhooks_delivered,
  (SELECT COUNT(*) FROM partner_webhook_deliveries d
     WHERE d.partner_id = p.id AND d.status IN ('failed', 'dead'))                  AS webhooks_failing
FROM api_partners p
LEFT JOIN orders o ON o.partner_id = p.id
GROUP BY p.id;

REVOKE ALL ON partner_api_stats FROM anon, authenticated;

COMMIT;
