---
id: FND-002
title: Schema drift — duplicate table definitions across migrations
category: ConfigDrift
severity: High
effort: M
status: Open
components: CMP-035, CMP-037
---

# [[FND-002]] Schema Drift — Duplicate Table Definitions

## Summary
Tables `promo_codes`, `driver_locations`, and `chef_payout_accounts` are defined in both migration `00001` and `00004` with slightly different column types (VARCHAR vs TEXT). The `IF NOT EXISTS` guard prevents runtime failure but masks the underlying schema planning drift.

## Evidence
- Migration 00001: `promo_codes.code VARCHAR(50)`, `driver_locations.coordinates TEXT`
- Migration 00004: `promo_codes.code TEXT`, `driver_locations.coordinates JSONB`
- `IF NOT EXISTS` silently ignores the second definition in a fresh deployment

## Impact
- In a fresh database deploy, the first definition wins; the column type may differ from what the code expects
- [[CMP-035]] PromoRepository and [[CMP-037]] DriverPresenceRepository may have alias workarounds masking the mismatch
- Difficult to reason about authoritative schema without reading all migrations

## Recommendation
1. Consolidate duplicate table definitions into a single canonical migration
2. Audit all column type references in repositories against the actual table schema
3. Add a schema linting step to CI to catch redefinitions

## Fix Effort
M — requires migration consolidation and repository audit.
