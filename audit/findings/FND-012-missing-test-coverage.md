---
id: FND-012
category: TestGap
severity: High
effort: L
---

# [[FND-012]] Missing test coverage (11 of 331 files)

## Summary
Only 11 test files exist across the entire codebase. The engine package has 8 test files (best covered). Web app has 4 test files. No tests exist for any repositories, auth package, validation schemas, or 54 of 55 API routes.

## Affected components
- [[CMP-024]] through [[CMP-038]] (repositories — 0 tests)
- [[CMP-040]] through [[CMP-042]] (auth — 0 tests)
- [[CMP-050]], [[CMP-051]] (critical API routes — 0 tests)

## Evidence
- `apps/web/__tests__/` — 4 files
- `packages/engine/src/` — 8 .test.ts files
- No test files in: packages/db, packages/auth, packages/validation, packages/utils, apps/chef-admin, apps/ops-admin, apps/driver-app

## Why this matters
Critical payment paths (checkout, webhook, refund) have zero test coverage. Schema changes could break repository queries undetected.

## Proposed fix
Priority targets: Stripe webhook handler, checkout route, OrderOrchestrator, DispatchEngine, key repositories.
