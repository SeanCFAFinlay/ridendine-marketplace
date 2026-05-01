-- Phase C checkout hardening:
-- - request idempotency ledger for checkout retries
-- - prevent duplicate order/payment side effects for same request key

CREATE TABLE IF NOT EXISTS checkout_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  idempotency_key VARCHAR(128) NOT NULL,
  request_hash VARCHAR(128) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_intent_id VARCHAR(255),
  response_payload JSONB,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_created_at
  ON checkout_idempotency_keys(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_status
  ON checkout_idempotency_keys(status);

ALTER TABLE checkout_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Server-only table: no direct client access; route handlers use service role.
REVOKE ALL ON checkout_idempotency_keys FROM anon, authenticated;
