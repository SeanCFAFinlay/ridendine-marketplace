-- Platform settings (single row)
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  hst_rate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
  max_delivery_radius_km DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings if not exists
INSERT INTO platform_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

-- Driver locations history table
CREATE TABLE IF NOT EXISTS driver_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at ON driver_locations(recorded_at);

-- Notifications table (already created in 00001 with is_read column)
-- Skip recreation, just ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Promo codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_amount DECIMAL(10, 2) DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Chef payout accounts (Stripe Connect)
CREATE TABLE IF NOT EXISTS chef_payout_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT NOT NULL,
  stripe_account_status TEXT NOT NULL DEFAULT 'pending',
  payout_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chef_payout_accounts_chef_id ON chef_payout_accounts(chef_id);

-- Chef payouts history
CREATE TABLE IF NOT EXISTS chef_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  stripe_transfer_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  status TEXT NOT NULL DEFAULT 'pending',
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  orders_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chef_payouts_chef_id ON chef_payouts(chef_id);
CREATE INDEX IF NOT EXISTS idx_chef_payouts_status ON chef_payouts(status);

-- Order status history index
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
ON order_status_history(order_id);

-- Add current_lat and current_lng to driver_presence if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_presence' AND column_name = 'current_lat'
  ) THEN
    ALTER TABLE driver_presence ADD COLUMN current_lat DECIMAL(10, 8);
    ALTER TABLE driver_presence ADD COLUMN current_lng DECIMAL(11, 8);
    ALTER TABLE driver_presence ADD COLUMN last_location_update TIMESTAMPTZ;
  END IF;
END $$;

-- RLS Policies for new tables
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_payouts ENABLE ROW LEVEL SECURITY;

-- Platform settings: read-only for authenticated
CREATE POLICY "Platform settings readable by authenticated" ON platform_settings
  FOR SELECT TO authenticated USING (true);

-- Driver locations: drivers can insert their own, ops can read all
CREATE POLICY "Drivers can insert own locations" ON driver_locations
  FOR INSERT TO authenticated
  WITH CHECK (driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Ops can read all driver locations" ON driver_locations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM platform_users WHERE user_id = auth.uid() AND role = 'ops_admin')
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- Notifications: users can read/update their own
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Promo codes: authenticated can read active, ops can manage all
CREATE POLICY "Read active promo codes" ON promo_codes
  FOR SELECT TO authenticated USING (is_active = true);

-- Push subscriptions: users manage their own
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL TO authenticated USING (user_id = auth.uid());

-- Chef payout accounts: chefs can read their own
CREATE POLICY "Chefs can read own payout accounts" ON chef_payout_accounts
  FOR SELECT TO authenticated USING (
    chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
  );

-- Chef payouts: chefs can read their own
CREATE POLICY "Chefs can read own payouts" ON chef_payouts
  FOR SELECT TO authenticated USING (
    chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
  );
