# Phase C — API / Checkout / Stripe / Business Engine Plan

Focus findings: F-003, F-012, F-025, F-028, F-031, plus IRR-020/021/022/023/028.

## C1. IRR-022 route hooks (checkout first)

- Files: `apps/web/src/app/api/checkout/route.ts`, `packages/engine/src/orchestrators/risk.engine.ts`
- Plan:
  1. Call `evaluateCheckoutRisk` after actor/cart/readiness validation.
  2. Convert risk verdict to structured API response and deny pre-payment on high risk.
  3. Persist risk decision in audit/domain event trail.
- Tests: route integration tests for allowed/blocked; ensure no Stripe side effect on blocked.

## C2. Server-trusted totals and stale-cart safety

- Files: `apps/web/src/app/checkout/page.tsx`, `apps/web/src/lib/customer-ordering.ts`, checkout route
- Plan:
  1. UI renders totals only from server quote payload.
  2. Add stale cart/version mismatch detection before payment.
  3. Reject mismatched client-submitted totals (if present).
- Tests: stale cart integration test; UI uses returned totals only.

## C3. Stripe safety and behavior matrix

| Environment | Allowed key types | Required guards |
|---|---|---|
| local/dev | test only | boot-time reject live keys |
| staging | test only | boot-time reject live keys + webhook secret required |
| production | live only (or explicitly configured) | key consistency + alerting |

- Files: stripe service/env helper modules, deploy docs.
- Tests:
  - mixed-mode key configs fail startup.
  - webhook signature missing/invalid rejected.
  - duplicate webhook replay idempotent.

## C4. Payment-to-order reconciliation and failure paths

- Files: webhook route, order state transitions, ops finance/export routes, ledger repos
- Plan:
  1. Ensure failed payment never yields confirmed order state.
  2. Ensure webhook success maps deterministically to order/payment states.
  3. Add reconciliation endpoint/query used by ops dashboard/export.
- Tests: failed payment scenario, duplicate webhook scenario, reconciliation consistency tests.

## C5. Refund/cancel and payout path hardening

- Files: `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts`, payout routes, engine finance services
- Plan:
  1. Validate role/capability on refund path.
  2. Add idempotency key strategy for refund requests.
  3. Verify payout setup/request behavior and error handling.
- Tests: unauthorized refund blocked, duplicate refund prevented, payout route role checks.

## C6. Shared validation coverage

- Files: `packages/validation/*`, route handlers across apps
- Plan:
  1. Add/expand Zod schemas for checkout/support/refund/export endpoints.
  2. Remove ad-hoc parsing where present.
- Tests: schema reject tests + route response shape assertions.

## C7. Error handling and observability

- Ensure all critical routes return normalized error objects and redact sensitive fields.
- Add correlation ID passthrough (paired with Phase E logging work).

## Acceptance criteria

1. Checkout blocks high-risk requests before Stripe/payment creation.
2. Duplicate webhooks and failed payments are fully tested.
3. Dev/staging cannot accidentally process live money.
4. Ops reconciliation evidence available via tested API/export path.
