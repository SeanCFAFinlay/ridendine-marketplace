-- ==========================================
-- ANALYTICS EVENTS TABLE
-- Lightweight business event tracking (no third-party SDKs)
-- ==========================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  user_id UUID,
  session_id TEXT,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id) WHERE user_id IS NOT NULL;

-- Partition-friendly index for date range queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_date ON analytics_events(event_name, created_at DESC);

-- RLS: anyone can insert, only ops can read
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events" ON analytics_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Also allow anonymous inserts (page views from non-logged-in users)
CREATE POLICY "Anon can insert analytics events" ON analytics_events
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Ops can read analytics" ON analytics_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
      AND is_active = true
    )
  );
