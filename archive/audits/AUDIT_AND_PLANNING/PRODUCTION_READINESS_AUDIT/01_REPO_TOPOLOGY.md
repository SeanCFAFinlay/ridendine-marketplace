# Repo Topology Audit

## Workspace
| Area | Path | Evidence | Production relevance | Status |
| --- | --- | --- | --- | --- |
| Apps | apps/web, apps/chef-admin, apps/driver-app, apps/ops-admin | [apps/web](../../apps/web)<br>[apps/chef-admin](../../apps/chef-admin)<br>[apps/driver-app](../../apps/driver-app)<br>[apps/ops-admin](../../apps/ops-admin) | Four deployable product surfaces | WIRED |
| Packages | packages/auth, packages/config, packages/db, packages/engine, packages/notifications, packages/routing, packages/types, packages/ui, packages/utils, packages/validation | [packages/auth/package.json](../../packages/auth/package.json)<br>[packages/config/package.json](../../packages/config/package.json)<br>[packages/db/package.json](../../packages/db/package.json)<br>[packages/engine/package.json](../../packages/engine/package.json)<br>[packages/notifications/package.json](../../packages/notifications/package.json)<br>[packages/routing/package.json](../../packages/routing/package.json)<br>[packages/types/package.json](../../packages/types/package.json)<br>[packages/ui/package.json](../../packages/ui/package.json)<br>[packages/utils/package.json](../../packages/utils/package.json)<br>[packages/validation/package.json](../../packages/validation/package.json) | Shared business, data, UI, auth, routing, validation | WIRED |
| Scripts | scripts | [scripts/audit/generate-production-readiness-audit.cjs](../../scripts/audit/generate-production-readiness-audit.cjs)<br>[scripts/load/run-load-smoke.mjs](../../scripts/load/run-load-smoke.mjs)<br>[scripts/sla-runner.ts](../../scripts/sla-runner.ts)<br>[scripts/ui/build-page-registry.ts](../../scripts/ui/build-page-registry.ts)<br>[scripts/ui/generate-command-center-docs.ts](../../scripts/ui/generate-command-center-docs.ts)<br>[scripts/ui/generate-ui-screenshots.ts](../../scripts/ui/generate-ui-screenshots.ts)<br>[scripts/ui/sync-ui-screenshots.ts](../../scripts/ui/sync-ui-screenshots.ts)<br>[scripts/verify-prod-data-hygiene.mjs](../../scripts/verify-prod-data-hygiene.mjs)<br>[scripts/wiring/generate-wiring-docs.cjs](../../scripts/wiring/generate-wiring-docs.cjs) | Operational, UI docs, load/smoke helpers | PARTIAL |
| Migrations | supabase/migrations | [supabase/migrations/00001_initial_schema.sql](../../supabase/migrations/00001_initial_schema.sql)<br>[supabase/migrations/00002_rls_policies.sql](../../supabase/migrations/00002_rls_policies.sql)<br>[supabase/migrations/00003_fix_rls.sql](../../supabase/migrations/00003_fix_rls.sql)<br>[supabase/migrations/00004_additions.sql](../../supabase/migrations/00004_additions.sql)<br>[supabase/migrations/00005_anon_read_policies.sql](../../supabase/migrations/00005_anon_read_policies.sql)<br>[supabase/migrations/00006_fix_order_items.sql](../../supabase/migrations/00006_fix_order_items.sql)<br>[supabase/migrations/00007_central_engine_tables.sql](../../supabase/migrations/00007_central_engine_tables.sql)<br>[supabase/migrations/00008_engine_rpc_functions.sql](../../supabase/migrations/00008_engine_rpc_functions.sql)<br>[supabase/migrations/00009_ops_admin_control_plane.sql](../../supabase/migrations/00009_ops_admin_control_plane.sql)<br>[supabase/migrations/00010_contract_drift_repair.sql](../../supabase/migrations/00010_contract_drift_repair.sql) | Database source of truth | WIRED |
| Seeds | supabase/seeds | [supabase/seeds/seed.sql](../../supabase/seeds/seed.sql) | Local/test data only; not production data | PARTIAL |
| UI command center | docs/ui + apps/web/internal | [docs/ui/page-registry.json](../../docs/ui/page-registry.json)<br>[apps/web/src/app/internal/command-center/page.tsx](../../apps/web/src/app/internal/command-center/page.tsx) | Internal operating documentation surface | PARTIAL |
| Wiring docs | docs/wiring | [docs/wiring/ROUTE_INVENTORY.md](../../docs/wiring/ROUTE_INVENTORY.md)<br>[docs/wiring/API_INVENTORY.md](../../docs/wiring/API_INVENTORY.md) | Source for route/API/wiring visibility | WIRED |

## Package Scripts
```json
{
  "dev": "turbo dev",
  "dev:web": "turbo dev --filter=@ridendine/web",
  "dev:chef": "turbo dev --filter=@ridendine/chef-admin",
  "dev:ops": "turbo dev --filter=@ridendine/ops-admin",
  "dev:driver": "turbo dev --filter=@ridendine/driver-app",
  "build": "turbo build",
  "lint": "turbo lint",
  "typecheck": "turbo typecheck",
  "clean": "turbo clean && rm -rf node_modules",
  "db:generate": "turbo db:generate --filter=@ridendine/db",
  "db:migrate": "supabase db push",
  "db:seed": "supabase db seed",
  "db:reset": "supabase db reset",
  "verify:prod-data-hygiene": "node scripts/verify-prod-data-hygiene.mjs",
  "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\"",
  "test": "pnpm -r --if-present test",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:smoke": "playwright test --grep @smoke",
  "test:load": "node scripts/load/run-load-smoke.mjs",
  "test:load:dry-run": "node scripts/load/run-load-smoke.mjs --dry-run",
  "test:load:staging": "node scripts/load/run-load-smoke.mjs",
  "ui:screenshots": "tsx scripts/ui/generate-ui-screenshots.ts",
  "ui:registry": "tsx scripts/ui/build-page-registry.ts",
  "ui:screenshots:sync": "tsx scripts/ui/sync-ui-screenshots.ts",
  "ui:docs": "tsx scripts/ui/generate-command-center-docs.ts",
  "ui:command-center": "pnpm ui:registry && pnpm ui:screenshots:sync && pnpm ui:docs"
}
```

## Dependency Graph
| Node | Depends on / Used by | Status |
| --- | --- | --- |
| apps/web | @ridendine/ui, db, engine, validation, auth, routing, Stripe/Supabase APIs | PARTIAL |
| apps/chef-admin | @ridendine/db/ui; chef order/menu/storefront APIs | PARTIAL |
| apps/driver-app | @ridendine/db/routing/ui; delivery/offers/location APIs | PARTIAL |
| apps/ops-admin | @ridendine/engine/db/ui; finance/dispatch/admin APIs | PARTIAL |
| packages/engine | Business rules, order state, dispatch, payout, reconciliation services | PARTIAL |
| packages/db | Supabase clients/repositories/realtime/schema | PARTIAL |

## Unknown / Obsolete / Generated Areas
| Path | Classification | Reason | Status |
| --- | --- | --- | --- |
| graphify-out | Generated/unknown | Not part of app/package/deployment scripts | UNKNOWN |
| AUDIT_AND_DEBUG | Historical audit/debug output | Useful for context, not deployable product code | PARTIAL |
| test-results | Generated test artifact | Not production code | WIRED |
| docs/ui/screenshots | Generated UI artifacts | Command center assets | WIRED |
| docs/wiring | Generated wiring docs | Internal audit and operating docs | WIRED |
