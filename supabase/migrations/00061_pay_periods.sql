-- ==========================================
-- PAY PERIODS (Stage 14 — Ghost-Kitchen Phase D.1, Path A export)
-- 00061_pay_periods.sql
--
-- Additive only. A commissary-scoped pay period the operator locks and then
-- exports (hours × rate) to a payroll provider. We do NOT store tax/CPP/EI —
-- Path A leaves withholding to the provider.
--
-- Locking freezes the period's time_entries: a DB trigger rejects any
-- UPDATE/DELETE of a time entry whose clock-in date falls inside a locked or
-- exported period for that kitchen, so pay can't drift after it's been run.
--
-- RLS: operator -> own kitchen (is_operator_of_kitchen, defined in 00055);
-- ops -> read-only; service_role -> full.
-- ==========================================

CREATE TABLE IF NOT EXISTS pay_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id   UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  starts_on    DATE NOT NULL,
  ends_on      DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'exported')),
  locked_at    TIMESTAMPTZ,
  locked_by    UUID,
  exported_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_kitchen ON pay_periods(kitchen_id, starts_on);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_periods_kitchen_range ON pay_periods(kitchen_id, starts_on, ends_on);

DROP TRIGGER IF EXISTS update_pay_periods_updated_at ON pay_periods;
CREATE TRIGGER update_pay_periods_updated_at BEFORE UPDATE ON pay_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Freeze time entries inside a locked/exported period.
CREATE OR REPLACE FUNCTION public.block_locked_time_entry_edits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pay_periods pp
    WHERE pp.kitchen_id = OLD.kitchen_id
      AND pp.status IN ('locked', 'exported')
      AND OLD.clock_in::date BETWEEN pp.starts_on AND pp.ends_on
  ) THEN
    RAISE EXCEPTION 'time entry falls in a locked pay period and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_locked_time_entries ON time_entries;
CREATE TRIGGER trg_block_locked_time_entries
  BEFORE UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_locked_time_entry_edits();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operator_manage_pay_periods" ON pay_periods;
CREATE POLICY "operator_manage_pay_periods" ON pay_periods FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_pay_periods" ON pay_periods;
CREATE POLICY "ops_read_pay_periods" ON pay_periods FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_pay_periods" ON pay_periods;
CREATE POLICY "service_role_pay_periods" ON pay_periods FOR ALL TO service_role
  USING (true) WITH CHECK (true);
