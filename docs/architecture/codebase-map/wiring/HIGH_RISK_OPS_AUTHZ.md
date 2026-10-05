# High-Risk Ops Authorization Contracts

Generated: 2026-10-05T17:14:30.072Z

This generated audit documents static authorization contracts for high-risk Ops/control-plane routes. It does not change route behavior; it fails if a route drops its expected actor context, capability guard, processor token validation, Stripe signature validation, or internal command-center gate.

## Summary

| Metric | Count |
|---|---:|
| Contracted route files | 16 |
| Passed route files | 16 |
| Failed checks | 0 |

## Contract Matrix

| Status | Area | Route | File | Methods | Required tokens |
|---|---|---|---|---|---|
| PASS | Dispatch | `/api/engine/dispatch` | `apps/ops-admin/src/app/api/engine/dispatch/route.ts` | GET, POST | getOpsActorContext, guardPlatformApi, dispatch_read, dispatch_write |
| PASS | Dispatch | `/api/engine/dispatch/offer-history` | `apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts` | GET | getOpsActorContext, guardPlatformApi, dispatch_read |
| PASS | Finance | `/api/engine/finance` | `apps/ops-admin/src/app/api/engine/finance/route.ts` | GET, POST | getOpsActorContext, guardPlatformApi, finance_engine |
| PASS | Refunds | `/api/engine/refunds` | `apps/ops-admin/src/app/api/engine/refunds/route.ts` | GET, POST | getOpsActorContext, guardPlatformApi, finance_refunds_read, finance_refunds_request, finance_refunds_sensitive |
| PASS | Payouts | `/api/engine/payouts` | `apps/ops-admin/src/app/api/engine/payouts/route.ts` | GET, POST | getOpsActorContext, guardPlatformApi, finance_payouts |
| PASS | Payouts | `/api/engine/payouts/preview` | `apps/ops-admin/src/app/api/engine/payouts/preview/route.ts` | POST | getOpsActorContext, guardPlatformApi, finance_payouts |
| PASS | Payouts | `/api/engine/payouts/execute` | `apps/ops-admin/src/app/api/engine/payouts/execute/route.ts` | POST | getOpsActorContext, guardPlatformApi, finance_payouts |
| PASS | Payouts | `/api/engine/payouts/instant` | `apps/ops-admin/src/app/api/engine/payouts/instant/route.ts` | GET | getOpsActorContext, guardPlatformApi, finance_payouts |
| PASS | Payouts | `/api/engine/payouts/instant/[id]` | `apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts` | POST, DELETE | getOpsActorContext, guardPlatformApi, finance_payouts |
| PASS | Processor | `/api/engine/processors/expired-offers` | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` | GET, POST | validateEngineProcessorHeaders |
| PASS | Processor | `/api/engine/processors/reconciliation` | `apps/ops-admin/src/app/api/engine/processors/reconciliation/route.ts` | GET, POST | validateEngineProcessorHeaders |
| PASS | Processor | `/api/engine/processors/retention` | `apps/ops-admin/src/app/api/engine/processors/retention/route.ts` | GET, POST | validateEngineProcessorHeaders |
| PASS | Processor | `/api/engine/processors/sla` | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | GET, POST | validateEngineProcessorHeaders |
| PASS | Internal command center | `/api/internal/command-center/change-requests` | `apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts` | GET, POST, PATCH | INTERNAL_COMMAND_CENTER_ENABLED, getOpsActorContext, guardPlatformApi, team_manage, guardCommandCenter() |
| PASS | Order refund | `/api/orders/[id]/refund` | `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` | POST | getOpsActorContext, guardPlatformApi, finance_refunds_sensitive |
| PASS | Stripe finance webhook | `/api/stripe/webhook` | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | POST | stripe-signature, webhooks.constructEvent, webhookSecret |

## Failures

None found.
