# Engine Rewrite Safety Scan

**Date**: 2026-04-29
**Scope**: All production code in apps/ directory (excluding test files)
**Goal**: Identify remaining direct status mutations that bypass the canonical engines

---

## Findings

| File | Line | Pattern | Safe/Unsafe | Reason |
|------|------|---------|-------------|--------|
| `apps/chef-admin/.../payouts/request/route.ts` | 70 | `.insert({ status: 'processing' })` | MITIGATED | Payout insert - now audited through engine.audit.log() |
| `apps/chef-admin/.../payouts/request/route.ts` | 94-98 | `.update({ status: 'completed' })` | MITIGATED | Payout completion after Stripe success - now audited through engine.audit.log() |
| `apps/chef-admin/.../payouts/request/route.ts` | 109 | `.update({ status: 'failed' })` | MITIGATED | Payout failure - now audited through engine.audit.log() |
| `apps/ops-admin/.../maintenance/route.ts` | 51-56 | `.update({ is_paused })` | SAFE | Storefront operational pause flag, not lifecycle status |
| `apps/ops-admin/.../dashboard/route.ts` | 129-136 | `.update({ acknowledged })` | SAFE | Alert acknowledgment flag, not lifecycle status |
| `apps/ops-admin/.../rules/route.ts` | 104-106 | `.update({ setting_value })` | SAFE | Platform configuration, not lifecycle status |
| `apps/ops-admin/.../team/route.ts` | 79 | `.update({ role, is_active })` | SAFE | User management, not order/delivery lifecycle |
| `apps/ops-admin/.../promos/route.ts` | 69 | `.update({ is_active })` | SAFE | Promo code toggle, not lifecycle status |
| `apps/web/.../reviews/route.ts` | 157-161 | `.update({ average_rating })` | SAFE | Denormalized metrics, not lifecycle status |
| `apps/web/.../notifications/route.ts` | 92, 100 | `.update({ read })` | SAFE | Notification read flag, not lifecycle status |

## Order Status Mutations

**All order status mutations now go through engine orchestrators.** No app route directly updates `orders.status` or `orders.engine_status`.

- `apps/ops-admin/.../refund/route.ts` - **FIXED**: Now calls `engine.masterOrder.refundOrder()` instead of direct `.update({ payment_status })`
- All other order routes already delegated to engine

## Delivery Status Mutations

**All delivery status mutations go through engine orchestrators.** No app route directly updates `deliveries.status`.

## Payment Status Mutations

**Payment status is now controlled by the engine.** The refund route was the only app-level bypass and has been fixed.

## Payout Status

Payout mutations remain in the app route but are now **audited through engine.audit.log()** for every status change. A future PayoutEngine could formalize this further, but the audit trail is in place.

## Remaining Risks

1. **Payout lifecycle**: No formal state machine for payouts yet. Transitions are audited but not validated against a state machine.
2. **E2E tests**: Test files still do direct DB mutations (acceptable for testing).
3. **Pre-existing**: The `stripe-payment.e2e.ts` has a TypeScript error for missing `stripe` types in the engine package (pre-existing, not caused by this rewrite).

## Recommendation

- Future work: Create a `PayoutEngine` with a state machine for `processing -> completed/failed` transitions.
- Current state: All order and delivery lifecycle mutations are engine-controlled. Payouts are audited.
