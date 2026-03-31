-- ==========================================
-- CENTRAL BUSINESS ENGINE TABLES
-- Migration: 00007_central_engine_tables
-- ==========================================

-- Domain Events table for event sourcing and real-time propagation
CREATE TABLE IF NOT EXISTS domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  actor_user_id UUID REFERENCES auth.users(id),
  actor_role VARCHAR(50) NOT NULL,
  actor_entity_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_domain_events_entity ON domain_events(entity_type, entity_id);
CREATE INDEX idx_domain_events_type ON domain_events(event_type);
CREATE INDEX idx_domain_events_unpublished ON domain_events(published) WHERE published = false;
CREATE INDEX idx_domain_events_created ON domain_events(created_at DESC);

-- Order Exceptions/Incidents table
CREATE TABLE IF NOT EXISTS order_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'in_progress', 'pending_customer', 'pending_chef', 'pending_driver', 'resolved', 'closed', 'escalated')),
  order_id UUID REFERENCES orders(id),
  customer_id UUID REFERENCES customers(id),
  chef_id UUID REFERENCES chef_profiles(id),
  driver_id UUID REFERENCES drivers(id),
  delivery_id UUID REFERENCES deliveries(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  recommended_actions JSONB DEFAULT '[]',
  internal_notes TEXT,
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  linked_refund_id UUID,
  linked_payout_adjustment_id UUID,
  sla_deadline TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES platform_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_exceptions_status ON order_exceptions(status);
CREATE INDEX idx_order_exceptions_severity ON order_exceptions(severity);
CREATE INDEX idx_order_exceptions_order ON order_exceptions(order_id);
CREATE INDEX idx_order_exceptions_open ON order_exceptions(status, severity) WHERE status NOT IN ('resolved', 'closed');

-- SLA Timers table
CREATE TABLE IF NOT EXISTS sla_timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'warning', 'breached', 'completed', 'cancelled')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  warning_at TIMESTAMPTZ,
  deadline_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  breached_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sla_timers_active ON sla_timers(status, deadline_at) WHERE status = 'active';
CREATE INDEX idx_sla_timers_entity ON sla_timers(entity_type, entity_id);
CREATE INDEX idx_sla_timers_type ON sla_timers(sla_type);

-- Kitchen Queue Entries table
CREATE TABLE IF NOT EXISTS kitchen_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id),
  order_id UUID NOT NULL REFERENCES orders(id) UNIQUE,
  position INTEGER NOT NULL,
  estimated_prep_minutes INTEGER NOT NULL DEFAULT 20,
  actual_prep_minutes INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kitchen_queue_storefront ON kitchen_queue_entries(storefront_id, position) WHERE status IN ('queued', 'in_progress');
CREATE INDEX idx_kitchen_queue_order ON kitchen_queue_entries(order_id);

-- Ledger Entries table for financial tracking
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  entry_type VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'CAD',
  description VARCHAR(255),
  entity_type VARCHAR(50),
  entity_id UUID,
  stripe_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_entries_order ON ledger_entries(order_id);
CREATE INDEX idx_ledger_entries_type ON ledger_entries(entry_type);
CREATE INDEX idx_ledger_entries_entity ON ledger_entries(entity_type, entity_id);
CREATE INDEX idx_ledger_entries_stripe ON ledger_entries(stripe_id) WHERE stripe_id IS NOT NULL;

-- Assignment Attempts table for dispatch tracking
CREATE TABLE IF NOT EXISTS assignment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  attempt_number INTEGER NOT NULL DEFAULT 1,
  offered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  decline_reason VARCHAR(255),
  distance_meters INTEGER,
  estimated_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignment_attempts_delivery ON assignment_attempts(delivery_id);
CREATE INDEX idx_assignment_attempts_driver ON assignment_attempts(driver_id);
CREATE INDEX idx_assignment_attempts_pending ON assignment_attempts(response, expires_at) WHERE response = 'pending';

-- Ops Override Logs table
CREATE TABLE IF NOT EXISTS ops_override_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  before_state JSONB NOT NULL,
  after_state JSONB NOT NULL,
  reason TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role VARCHAR(50) NOT NULL,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ops_override_logs_entity ON ops_override_logs(entity_type, entity_id);
CREATE INDEX idx_ops_override_logs_actor ON ops_override_logs(actor_user_id);
CREATE INDEX idx_ops_override_logs_created ON ops_override_logs(created_at DESC);

-- Refund Cases table
CREATE TABLE IF NOT EXISTS refund_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  exception_id UUID REFERENCES order_exceptions(id),
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_amount_cents INTEGER NOT NULL,
  approved_amount_cents INTEGER,
  refund_reason VARCHAR(50) NOT NULL,
  refund_notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'processing', 'completed', 'failed')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  stripe_refund_id VARCHAR(255),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refund_cases_order ON refund_cases(order_id);
CREATE INDEX idx_refund_cases_status ON refund_cases(status);
CREATE INDEX idx_refund_cases_pending ON refund_cases(status) WHERE status IN ('pending', 'approved', 'processing');

-- Payout Adjustments table
CREATE TABLE IF NOT EXISTS payout_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payee_type VARCHAR(20) NOT NULL CHECK (payee_type IN ('chef', 'driver')),
  payee_id UUID NOT NULL,
  order_id UUID REFERENCES orders(id),
  refund_case_id UUID REFERENCES refund_cases(id),
  adjustment_type VARCHAR(50) NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'reversed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  applied_to_payout_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payout_adjustments_payee ON payout_adjustments(payee_type, payee_id);
CREATE INDEX idx_payout_adjustments_order ON payout_adjustments(order_id);
CREATE INDEX idx_payout_adjustments_status ON payout_adjustments(status);

-- Storefront State Changes table
CREATE TABLE IF NOT EXISTS storefront_state_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id),
  previous_state VARCHAR(50),
  new_state VARCHAR(50) NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_role VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_storefront_state_changes_storefront ON storefront_state_changes(storefront_id);
CREATE INDEX idx_storefront_state_changes_created ON storefront_state_changes(created_at DESC);

-- System Alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id UUID,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  auto_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system_alerts_active ON system_alerts(acknowledged, severity) WHERE acknowledged = false;
CREATE INDEX idx_system_alerts_type ON system_alerts(alert_type);
CREATE INDEX idx_system_alerts_created ON system_alerts(created_at DESC);

-- Add new columns to existing tables

-- Add extended status to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS engine_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(100),
ADD COLUMN IF NOT EXISTS cancellation_notes TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_prep_minutes INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS actual_prep_minutes INTEGER,
ADD COLUMN IF NOT EXISTS prep_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exception_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_engine_status ON orders(engine_status);

-- Add storefront state columns
ALTER TABLE chef_storefronts
ADD COLUMN IF NOT EXISTS storefront_state VARCHAR(50) DEFAULT 'published',
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS paused_reason TEXT,
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paused_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS current_queue_size INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_queue_size INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS is_overloaded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS average_prep_minutes INTEGER DEFAULT 20;

CREATE INDEX IF NOT EXISTS idx_storefronts_state ON chef_storefronts(storefront_state, is_paused);

-- Add menu item availability tracking
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS is_sold_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sold_out_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS restock_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS daily_limit INTEGER,
ADD COLUMN IF NOT EXISTS daily_sold INTEGER DEFAULT 0;

-- Add driver assignment tracking to deliveries
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS assignment_attempts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_assignment_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_to_ops BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pickup_proof_url TEXT,
ADD COLUMN IF NOT EXISTS dropoff_proof_url TEXT,
ADD COLUMN IF NOT EXISTS customer_signature_url TEXT,
ADD COLUMN IF NOT EXISTS delivery_notes TEXT;

-- Create comprehensive audit log trigger function
CREATE OR REPLACE FUNCTION log_audit_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    entity_type,
    entity_id,
    action,
    old_data,
    new_data,
    user_id,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    auth.uid(),
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_deliveries ON deliveries;
CREATE TRIGGER audit_deliveries
  AFTER INSERT OR UPDATE OR DELETE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_chef_storefronts ON chef_storefronts;
CREATE TRIGGER audit_chef_storefronts
  AFTER INSERT OR UPDATE OR DELETE ON chef_storefronts
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

DROP TRIGGER IF EXISTS audit_refund_cases ON refund_cases;
CREATE TRIGGER audit_refund_cases
  AFTER INSERT OR UPDATE OR DELETE ON refund_cases
  FOR EACH ROW EXECUTE FUNCTION log_audit_change();

-- Update audit_logs table if it doesn't have all needed columns
ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS action VARCHAR(20),
ADD COLUMN IF NOT EXISTS old_data JSONB,
ADD COLUMN IF NOT EXISTS new_data JSONB;

-- RLS Policies for new tables

-- Domain events: Only system and admins can write, authenticated users can read their related events
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domain_events_insert_system" ON domain_events
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "domain_events_select_own" ON domain_events
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR actor_role IN ('ops_agent', 'ops_manager', 'finance_admin', 'super_admin'));

-- Order exceptions: Ops can manage all, others can view their related exceptions
ALTER TABLE order_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_exceptions_ops_all" ON order_exceptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

CREATE POLICY "order_exceptions_view_own" ON order_exceptions
  FOR SELECT TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- SLA timers: Only ops can manage
ALTER TABLE sla_timers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sla_timers_ops_all" ON sla_timers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

-- Kitchen queue: Chefs can manage their own, ops can manage all
ALTER TABLE kitchen_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kitchen_queue_chef_own" ON kitchen_queue_entries
  FOR ALL TO authenticated
  USING (
    storefront_id IN (
      SELECT cs.id FROM chef_storefronts cs
      JOIN chef_profiles cp ON cs.chef_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
  );

CREATE POLICY "kitchen_queue_ops_all" ON kitchen_queue_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

-- Ledger entries: Finance and ops can view all
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_entries_finance_view" ON ledger_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
    )
  );

CREATE POLICY "ledger_entries_insert_system" ON ledger_entries
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Assignment attempts: Ops can manage, drivers can view their own
ALTER TABLE assignment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignment_attempts_ops_all" ON assignment_attempts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

CREATE POLICY "assignment_attempts_driver_own" ON assignment_attempts
  FOR SELECT TO authenticated
  USING (
    driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Ops override logs: Only super admins and ops managers can view
ALTER TABLE ops_override_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ops_override_logs_admin_only" ON ops_override_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_manager', 'super_admin')
    )
  );

-- Refund cases: Finance and ops can manage
ALTER TABLE refund_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "refund_cases_ops_all" ON refund_cases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
    )
  );

-- Payout adjustments: Finance can manage
ALTER TABLE payout_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payout_adjustments_finance_all" ON payout_adjustments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('finance_admin', 'super_admin')
    )
  );

-- System alerts: Ops can manage
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_alerts_ops_all" ON system_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

-- Storefront state changes: Ops and chefs can view
ALTER TABLE storefront_state_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "storefront_state_changes_view" ON storefront_state_changes
  FOR SELECT TO authenticated
  USING (
    storefront_id IN (
      SELECT cs.id FROM chef_storefronts cs
      JOIN chef_profiles cp ON cs.chef_id = cp.id
      WHERE cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_agent', 'ops_manager', 'super_admin')
    )
  );

CREATE POLICY "storefront_state_changes_insert" ON storefront_state_changes
  FOR INSERT TO authenticated
  WITH CHECK (true);
