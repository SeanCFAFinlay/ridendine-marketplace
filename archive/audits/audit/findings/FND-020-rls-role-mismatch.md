---
id: FND-020
category: ConfigDrift
severity: Medium
effort: M
---

# [[FND-020]] RLS role mismatch

## Summary
Some RLS policies still reference the original 'ops_admin' role while the engine uses expanded roles: 'ops_agent', 'ops_manager', 'finance_admin'. Migration 00010 expanded the platform_users CHECK constraint but not all RLS policies were updated.

## Affected components
- Platform-wide (all RLS policies)

## Evidence
- `supabase/migrations/00004_additions.sql` — policies use `role = 'ops_admin'`
- `supabase/migrations/00010_contract_drift_repair.sql` — CHECK constraint expanded to include ops_agent, ops_manager, finance_admin
- `packages/engine/src/orchestrators/` — engine checks for ops_agent, ops_manager roles

## Why this matters
Users with ops_agent or finance_admin roles may be denied access by RLS policies that only check for ops_admin, even though the engine grants them permission.

## Proposed fix
Audit all RLS policies and update to reference the full role set from the expanded CHECK constraint.
