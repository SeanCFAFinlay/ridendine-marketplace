-- Phase 2 — Auth / role model: canonical support_agent and finance_manager platform roles.
-- Keeps existing roles for backward compatibility; does not modify prior migrations.

ALTER TABLE platform_users DROP CONSTRAINT IF EXISTS platform_users_role_check;
ALTER TABLE platform_users ADD CONSTRAINT platform_users_role_check
  CHECK (role IN (
    'ops_admin',
    'ops_agent',
    'ops_manager',
    'super_admin',
    'support',
    'support_agent',
    'finance_admin',
    'finance_manager'
  ));
