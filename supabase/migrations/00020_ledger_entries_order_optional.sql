-- Phase 5: payout / settlement ledger lines may not reference a single order.
ALTER TABLE ledger_entries
  ALTER COLUMN order_id DROP NOT NULL;

COMMENT ON COLUMN ledger_entries.order_id IS
  'FK to orders when movement ties to an order; NULL for aggregate payout run debits (Phase 5).';
