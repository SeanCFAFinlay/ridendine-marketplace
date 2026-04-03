# RIDENDINE Architecture Repair Audit Plan

## Baseline

- Repo shape matches the intended 4-app monorepo: `apps/web`, `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app`, with shared packages under `packages/*`.
- `pnpm typecheck` passes across the workspace.
- `pnpm lint` is not currently a real validation gate because `eslint` is not installed in the workspace, so all app lint tasks fail before any code is checked.

## Major Findings

### 1. Shared boundary drift

- Shared repositories exist in `packages/db`, but key storefront and menu flows are still implemented with direct table access inside app routes and pages.
- App-level `lib/engine.ts` wrappers instantiate the central engine, but many routes use the engine only for audit logging while bypassing shared repository and orchestration logic for the real mutation.

### 2. Storefront/menu propagation is only partially centralized

- `apps/chef-admin` storefront and menu APIs write directly to `chef_storefronts`, `menu_categories`, and `menu_items`.
- `apps/web` reads storefronts through shared repository functions, but storefront menu reads do not include category joins even though the customer menu UI expects category metadata.
- `apps/chef-admin` menu dashboard assembles categories and items ad hoc in the page instead of using a shared domain read model.

### 3. Ops-admin is not consistently acting as source of truth

- `apps/ops-admin` uses the central engine for some orchestration flows, but also performs direct admin writes for stateful operations such as storefront config changes.
- That pattern weakens audit/event consistency and makes business rules harder to keep centralized.

### 4. Production logic inconsistencies

- “Powered by Central Engine” routes are not consistently using shared domain logic.
- The customer home page still contains hardcoded chef spotlight content and static marketplace stats, which can drift from the actual storefront source of truth.

## Repair Principles

- Preserve the 4-app separation.
- Move domain reads/writes into shared packages instead of duplicating per app.
- Keep `ops-admin` as the orchestration control surface.
- Prefer minimal architectural repairs over broad rewrites.
- Validate after each phase.

## Phase Plan

### Phase 1: Shared domain read/write foundations

- Strengthen `packages/db` storefront/menu read models so both chef-admin and web can consume the same storefront/menu data shape.
- Remove obvious duplicated data assembly where shared package functions should exist.
- Keep mutations minimal and typed.

### Phase 2: Chef storefront/menu repair

- Refactor chef-admin storefront and menu APIs/pages to use shared domain functions instead of ad hoc direct table logic where feasible.
- Ensure chef storefront/menu updates propagate cleanly to the customer-facing web read path through shared data logic.
- Preserve current UI behavior.

### Phase 3: Ops-admin source-of-truth repair

- Refactor ops-admin stateful storefront/order control paths so orchestration-affecting mutations go through central engine or shared domain logic consistently.
- Leave pure read/reporting endpoints alone unless they block correctness.

### Phase 4: Validation and enforcement

- Run targeted validation after each phase.
- Restore lint as an actual validation step if it can be done safely inside the repo without introducing unrelated churn.
- Summarize remaining architectural debt separately from completed repairs.

## Validation Checkpoints

- After Phase 1: targeted typecheck for changed packages/apps.
- After Phase 2: targeted typecheck for `@ridendine/chef-admin` and `@ridendine/web`.
- After Phase 3: targeted typecheck for `@ridendine/ops-admin` and shared packages touched.
- Final: workspace `pnpm typecheck`, plus `pnpm lint` if lint tooling is repaired.
