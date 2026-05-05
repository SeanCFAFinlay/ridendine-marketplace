-- Bank payout rail for chef/driver disbursements.
-- Stripe remains the customer payment/refund processor; payouts are funded from the business bank account.

ALTER TABLE chef_payouts
  ADD COLUMN IF NOT EXISTS payment_rail TEXT NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS bank_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_reference TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE driver_payouts
  ADD COLUMN IF NOT EXISTS payment_rail TEXT NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS bank_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS bank_reference TEXT,
  ADD COLUMN IF NOT EXISTS reconciliation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_chef_payouts_bank_batch_id
  ON chef_payouts (bank_batch_id)
  WHERE bank_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_driver_payouts_bank_batch_id
  ON driver_payouts (bank_batch_id)
  WHERE bank_batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chef_payouts_bank_status
  ON chef_payouts (payment_rail, status, reconciliation_status);

CREATE INDEX IF NOT EXISTS idx_driver_payouts_bank_status
  ON driver_payouts (payment_rail, status, reconciliation_status);
