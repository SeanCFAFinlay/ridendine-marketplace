-- ============================================================================
-- 00049_review_pii_column_lockdown_and_rls_enforcement.sql
--
-- Security review remediation (2026-06):
--
--  R1. reviews PII column leak.
--      "Public can view reviews" (00017) lets anon/authenticated SELECT a
--      reviews row when is_visible = true. RLS cannot filter COLUMNS, so the
--      public PostgREST API exposed customer_id and order_id — direct linkage
--      into the private customers/orders tables — to anonymous callers.
--
--      The web app reads reviews ONLY through the service-role admin client
--      (apps/web/src/app/api/reviews/route.ts selects id, rating, comment,
--      created_at + a customers join), so anon/authenticated never need the PII
--      columns directly. Restrict their column-level SELECT to the safe public
--      display columns. The table-level SELECT grant from 00029
--      (GRANT ALL ON ALL TABLES TO anon, authenticated) must be REVOKED first,
--      because a table-level SELECT grant overrides per-column grants.
--
--  R2. Defensive RLS enforcement.
--      Because 00029 granted ALL on every table to anon/authenticated, RLS is
--      the only barrier protecting data. Ensure RLS is ENABLED on every base
--      table in the public schema (no-op where already enabled). service_role
--      bypasses RLS, so application/admin access is unaffected; only direct
--      anon/authenticated access is gated — and the public-readable tables keep
--      their explicit SELECT policies.
-- ============================================================================

BEGIN;

-- R1 — reviews: hide customer_id / order_id (and other non-display columns)
-- from anon & authenticated, while keeping reviews publicly viewable.
REVOKE SELECT ON reviews FROM anon, authenticated;
GRANT SELECT (
  id,
  storefront_id,
  rating,
  comment,
  chef_response,
  chef_responded_at,
  is_visible,
  created_at
) ON reviews TO anon, authenticated;

-- Keep RLS (and the is_visible row filter from 00017) in force on reviews.
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- R2 — ensure RLS is enabled on every ordinary base table in `public`.
-- Only tables OWNED by the migration role are eligible: ALTER TABLE ... ENABLE
-- ROW LEVEL SECURITY requires ownership. Extension-owned system tables that
-- land in `public` (notably PostGIS's `spatial_ref_sys`, owned by
-- supabase_admin on the local Supabase stack) are skipped — attempting to
-- alter them raises `must be owner of table` (SQLSTATE 42501) and would abort
-- the whole migration on a fresh `supabase db reset`. App tables are created by
-- the migration role, so they remain covered on both local and hosted apply.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'          -- ordinary tables only
      AND NOT c.relrowsecurity     -- RLS not yet enabled
      AND pg_catalog.pg_get_userbyid(c.relowner) = current_user  -- only tables we own
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'Enabled RLS on public.%', r.relname;
  END LOOP;
END $$;

COMMIT;
