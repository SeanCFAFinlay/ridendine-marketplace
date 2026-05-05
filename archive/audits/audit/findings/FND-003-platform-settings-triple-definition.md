---
id: FND-003
title: platform_settings table defined three times across migrations
category: ConfigDrift
severity: High
effort: M
status: Open
components: CMP-029
---

# [[FND-003]] Platform Settings Triple Definition

## Summary
The `platform_settings` table is defined in migrations `00004`, `00009`, and `00010` with incompatible schemas. Migration `00010` creates a full table with `setting_key`/`setting_value` columns that conflicts with the additive `ALTER TABLE` approach used in `00009`.

## Evidence
- Migration 00004: initial `platform_settings` table (minimal columns)
- Migration 00009: `ALTER TABLE platform_settings ADD COLUMN ...` (additive approach)
- Migration 00010: `CREATE TABLE platform_settings (setting_key, setting_value, ...)` — full redefinition, conflicts with 00009's adds

## Impact
- On a fresh database deploy the execution order determines which schema actually exists
- [[CMP-029]] PlatformRepository has sophisticated fallback logic for missing settings that was likely written to cope with this ambiguity
- Platform configuration is a critical path; incorrect settings silently affect fees, dispatch timeouts, and offer expiry

## Recommendation
1. Create a clean consolidating migration that defines the authoritative `platform_settings` schema
2. Mark migrations 00004 and 00009 platform_settings blocks as superseded in comments
3. Remove fallback/default logic from CMP-029 once schema is stable
4. Seed the table with required defaults in `supabase/seeds/`

## Fix Effort
M — migration consolidation, repository cleanup, seed update.
