# Testing QA Audit
| Suite | Count | Evidence | Status |
| --- | --- | --- | --- |
| Unit tests | 50 | [./packages/auth/src/middleware.test.ts](../.././packages/auth/src/middleware.test.ts)<br>[./packages/db/src/client/admin.test.ts](../.././packages/db/src/client/admin.test.ts)<br>[./packages/db/src/realtime/channels.test.ts](../.././packages/db/src/realtime/channels.test.ts)<br>[./packages/db/src/realtime/events.test.ts](../.././packages/db/src/realtime/events.test.ts)<br>[./packages/db/src/repositories/support.repository.test.ts](../.././packages/db/src/repositories/support.repository.test.ts)<br>[./packages/db/src/schema/phase0-business-engine.migration.test.ts](../.././packages/db/src/schema/phase0-business-engine.migration.test.ts)<br>[./packages/engine/src/constants.test.ts](../.././packages/engine/src/constants.test.ts)<br>[./packages/engine/src/core/business-rules-engine.test.ts](../.././packages/engine/src/core/business-rules-engine.test.ts) | PARTIAL |
| API tests | 7 | [./apps/driver-app/src/__tests__/location-route.test.ts](../.././apps/driver-app/src/__tests__/location-route.test.ts)<br>[./apps/driver-app/src/__tests__/offers-route.test.ts](../.././apps/driver-app/src/__tests__/offers-route.test.ts)<br>[./apps/ops-admin/src/app/api/analytics/trends/__tests__/route.test.ts](../.././apps/ops-admin/src/app/api/analytics/trends/__tests__/route.test.ts)<br>[./apps/web/__tests__/api/health.route.test.ts](../.././apps/web/__tests__/api/health.route.test.ts)<br>[./apps/web/__tests__/api/support/route.test.ts](../.././apps/web/__tests__/api/support/route.test.ts)<br>[./apps/web/src/app/api/checkout/__tests__/route.test.ts](../.././apps/web/src/app/api/checkout/__tests__/route.test.ts)<br>[./apps/web/src/app/api/webhooks/stripe/__tests__/stripe-webhook-route.test.ts](../.././apps/web/src/app/api/webhooks/stripe/__tests__/stripe-webhook-route.test.ts) | PARTIAL |
| Finance tests | 10 | [./apps/web/src/__tests__/stripe-adapter.test.ts](../.././apps/web/src/__tests__/stripe-adapter.test.ts)<br>[./apps/web/src/app/api/checkout/__tests__/route.test.ts](../.././apps/web/src/app/api/checkout/__tests__/route.test.ts)<br>[./apps/web/src/app/api/webhooks/stripe/__tests__/stripe-webhook-route.test.ts](../.././apps/web/src/app/api/webhooks/stripe/__tests__/stripe-webhook-route.test.ts)<br>[./packages/engine/src/orchestrators/payout-engine.test.ts](../.././packages/engine/src/orchestrators/payout-engine.test.ts)<br>[./packages/engine/src/services/ledger.service.test.ts](../.././packages/engine/src/services/ledger.service.test.ts)<br>[./packages/engine/src/services/payout.service.test.ts](../.././packages/engine/src/services/payout.service.test.ts)<br>[./packages/engine/src/services/reconciliation.service.test.ts](../.././packages/engine/src/services/reconciliation.service.test.ts)<br>[./packages/engine/src/services/stripe-webhook-idempotency.test.ts](../.././packages/engine/src/services/stripe-webhook-idempotency.test.ts) | PARTIAL |
| E2E/Smoke/Load | 4 | [e2e/fixtures/test-data.ts](../../e2e/fixtures/test-data.ts)<br>[e2e/platform-auth.smoke.spec.ts](../../e2e/platform-auth.smoke.spec.ts)<br>[e2e/web.smoke.spec.ts](../../e2e/web.smoke.spec.ts)<br>[scripts/load/run-load-smoke.mjs](../../scripts/load/run-load-smoke.mjs) | PARTIAL |

## Validation Commands
| Command | Exit | Notes |
| --- | --- | --- |
| pnpm lint | PASS | Exit 0. Turbo lint completed for web, ops-admin, driver-app, and chef-admin. |
| pnpm typecheck | PASS | Exit 0. Turbo typecheck completed across 13 packages/apps. |
| pnpm test | PASS | Exit 0. Unit and app tests passed; console output still includes existing mocked failure logs and React act warnings that should be cleaned up before production QA signoff. |
| pnpm build | PASS | Exit 0. Turbo build completed for web, ops-admin, chef-admin, and driver-app; all app builds were cache hits and replayed successful Next.js build logs. |

## Required Before Production
- Full customer order E2E with Stripe test mode.
- Chef accept/prep/ready E2E.
- Driver offer/accept/pickup/deliver E2E.
- Finance ledger/payout/refund/reconciliation acceptance suite.
- RBAC negative tests for customer/chef/driver/ops/finance boundaries.
- Deployment smoke tests per app/domain.
