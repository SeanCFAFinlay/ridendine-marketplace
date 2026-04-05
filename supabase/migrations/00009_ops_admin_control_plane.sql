ALTER TABLE platform_settings
ADD COLUMN IF NOT EXISTS dispatch_radius_km DECIMAL(5,2) NOT NULL DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS max_delivery_distance_km DECIMAL(5,2) NOT NULL DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS default_prep_time_minutes INTEGER NOT NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS offer_timeout_seconds INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS max_assignment_attempts INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS auto_assign_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS refund_auto_review_threshold_cents INTEGER NOT NULL DEFAULT 2500,
ADD COLUMN IF NOT EXISTS support_sla_warning_minutes INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS support_sla_breach_minutes INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS storefront_throttle_order_limit INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS storefront_throttle_window_minutes INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS storefront_auto_pause_enabled BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS storefront_pause_on_sla_breach BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

UPDATE platform_settings
SET
  dispatch_radius_km = COALESCE(dispatch_radius_km, max_delivery_radius_km, 10.00),
  max_delivery_distance_km = COALESCE(max_delivery_distance_km, max_delivery_radius_km, 15.00);

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS actor_role TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_created_at
ON audit_logs(entity_type, entity_id, created_at DESC);

DROP POLICY IF EXISTS "Platform settings readable by authenticated" ON platform_settings;

CREATE POLICY "Platform settings readable by authenticated" ON platform_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform settings ops_manage" ON platform_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_manager', 'finance_admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_manager', 'finance_admin', 'super_admin')
    )
  );
