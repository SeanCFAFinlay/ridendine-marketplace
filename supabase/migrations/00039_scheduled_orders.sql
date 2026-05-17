-- ============================================================================
-- 00039_scheduled_orders.sql
-- ----------------------------------------------------------------------------
-- Adds first-class scheduled-order support to the orders table.
--
-- Why: apps/web/src/app/api/checkout/route.ts:581-585 has been writing
--      `orders.scheduled_for` and `orders.status = 'scheduled'` for every
--      customer who picks a future delivery time via the DeliveryTimePicker.
--      Neither artefact exists in the canonical schema (see 00001 line 273+),
--      so the UPDATE fails with 42703 / 23514 and the checkout route bails
--      with INTERNAL_ERROR → the customer sees a payment failure. This
--      migration repairs the schema so scheduled checkouts succeed.
--
-- Changes:
--   1. orders.scheduled_for TIMESTAMPTZ NULL — explicit delivery time set by
--      the customer. NULL means ASAP.
--   2. CHECK constraint on orders.status extended to include 'scheduled' so
--      the route can park orders awaiting their delivery window before the
--      kitchen-submit transition fires.
--   3. Partial index for the dispatcher to find scheduled orders due for
--      release ahead of their delivery time.
-- ============================================================================

BEGIN;

-- 1. Add scheduled_for column (idempotent).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;

COMMENT ON COLUMN orders.scheduled_for IS
  'Customer-requested delivery time. NULL = ASAP order. Set at checkout when DeliveryTimePicker provides a future ISO timestamp.';

-- 2. Replace status CHECK constraint to add 'scheduled'.
--    Drop-then-recreate is the only path: Postgres CHECK constraints are
--    immutable. The DO block tolerates both possible existing names.
DO $$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'orders'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%pending%accepted%';
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE orders DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'scheduled',
    'accepted',
    'rejected',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'in_transit',
    'delivered',
    'completed',
    'cancelled',
    'refunded'
  ));

-- 3. Index for the scheduled-order release sweep.
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_release
  ON orders (scheduled_for)
  WHERE status = 'scheduled' AND scheduled_for IS NOT NULL;

COMMIT;
