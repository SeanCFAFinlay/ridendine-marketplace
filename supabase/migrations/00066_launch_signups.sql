-- ============================================================================
-- 00066_launch_signups.sql
--
-- "Tell me when ordering opens" list collected from ridendine.ca.
--
-- The consent wording and time are stored with each address because Canada's
-- anti-spam law puts the burden of proving consent on the sender.
--
-- Nobody but the service role can read or write this table: RLS is on with no
-- policies, and the API roles hold no grants. Sign-ups come in through
-- apps/web POST /api/launch-signup and are read in ops-admin.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS launch_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE
    CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254),
  source TEXT NOT NULL DEFAULT 'home' CHECK (source IN ('home', 'coming-soon')),
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_launch_signups_created_at
  ON launch_signups (created_at DESC);

ALTER TABLE launch_signups ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE launch_signups FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE launch_signups TO service_role;

COMMENT ON TABLE launch_signups IS
  'Launch notification list. Service role only. consent_text/consented_at are the proof of consent.';

COMMIT;
