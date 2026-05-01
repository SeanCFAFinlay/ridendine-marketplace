# Phase D — Testing / CI / Playwright Plan

Focus findings: F-002, F-007, F-008, F-027, F-034.

## Proposed test tree

```text
apps/web/e2e/
  customer.checkout.spec.ts
  customer.payment-failure.spec.ts
  chef.portal-link.spec.ts
apps/chef-admin/src/__tests__/
  api.orders.ownership.test.ts
  api.availability.test.ts
apps/driver-app/src/__tests__/
  api.deliveries.ownership.test.ts
  api.location.rate-limit.test.ts
apps/ops-admin/src/__tests__/
  finance.reconciliation.test.ts
e2e/playwright.config.ts (or apps/web/playwright.config.ts)
```

## Critical-path E2E coverage

1. Customer: browse -> menu -> cart -> checkout -> test payment flow -> confirmation.
2. Chef: login -> menu update -> availability update -> order accept/ready.
3. Ops: login -> orders -> support/audit route -> reconciliation view.
4. Driver: login -> assignment -> accept -> pickup -> en route -> delivered.

## Test data strategy

- Use deterministic seed fixtures for local/staging test tenant.
- Stripe: **test mode only**, never mocked success without route execution.
- Allowed mocks: third-party UI widgets, non-critical external APIs (maps/geocoding), email provider.
- Must be real app code: auth, ownership checks, checkout, webhook handlers, route guards.

## CI workflow edits

- Add chef-admin and driver-app test commands to package scripts and CI.
- Add Playwright job with artifact upload (traces/screenshots).
- Add nightly staging workflow (`schedule`) for smoke + core E2E.

## Commands (local)

- `pnpm verify:prod-data-hygiene`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm --filter @ridendine/web test:e2e` (new)
- `pnpm --filter @ridendine/chef-admin test` (new)
- `pnpm --filter @ridendine/driver-app test` (new)

## Commands (CI)

- Existing quality job plus:
  - `pnpm --filter @ridendine/chef-admin test`
  - `pnpm --filter @ridendine/driver-app test`
  - Playwright smoke and critical paths

## Acceptance criteria

1. Browser E2E exists and runs in CI.
2. Chef-admin and driver-app have non-empty automated test suites.
3. Security-sensitive API integration tests are in gate (ownership + authz + webhook).
4. Nightly staging smoke produces stored artifacts.
