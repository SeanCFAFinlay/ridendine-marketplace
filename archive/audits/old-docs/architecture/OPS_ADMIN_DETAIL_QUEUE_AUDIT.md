# Ops-Admin Detail And Queue Audit

Date: 2026-04-04

## Ranked Weak Points

1. **Delivery detail is the weakest control surface**
- File: `apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx`
- Business question: can ops understand dispatch state, route state, driver assignment, and intervene in a real delivery?
- Current state:
  - ad hoc direct query
  - timeline mixes likely-wrong timestamp fields
  - actions (`Assign Driver`, `Update Status`, `Reassign`, `Cancel Delivery`) are cosmetic buttons with no real handlers
  - no dispatch-board context or assignment-attempt context
- Why it matters: this page should be central to dispatch oversight and intervention.

2. **Driver detail is fragmented and partially fake**
- File: `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx`
- Business question: what is the driver’s current platform status, availability, recent delivery history, and governance state?
- Current state:
  - ad hoc direct queries
  - placeholder “Recent Deliveries coming soon”
  - action buttons are cosmetic
  - location fields appear to use stale/incorrect names against current presence shape
- Why it matters: ops needs a real driver oversight surface, not a profile mockup.

3. **Customer detail is passive and exposes fake actions**
- File: `apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx`
- Business question: who is this customer operationally, what is their ordering/support history, and does ops need to intervene?
- Current state:
  - ad hoc direct queries
  - placeholder action buttons (`Send Message`, `Issue Credit`)
  - limited operational context
  - likely stale address field names
- Why it matters: customer detail should support support/refund/order intervention context.

4. **Support queue is real but shallow**
- File: `apps/ops-admin/src/app/dashboard/support/page.tsx`
- Business question: what support work needs attention, how urgent is it, and what can ops do next?
- Current state:
  - real read/update path
  - queue lacks grouped operational summaries
  - no richer action states beyond resolve
  - still more gated CRUD than workflow
- Why it matters: support is part of the ops command center, not just a ticket list.

5. **Order detail is useful but still partly ad hoc**
- File: `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx`
- Business question: what is the full order context, what is blocked, and what engine-backed actions can ops take next?
- Current state:
  - real engine-backed actions
  - direct ad hoc read composition
  - no refund/financial intervention context on the page itself
  - lacks stronger linkage to delivery and chef/storefront governance
- Why it matters: order detail should be a first-class intervention page.

6. **Map has honesty risk due to schema drift**
- File: `apps/ops-admin/src/components/map/live-map.tsx`
- Business question: where are active deliveries and available drivers right now?
- Current state:
  - realtime intent is good
  - queries `driver_profiles`, but the current domain model elsewhere uses `drivers`
  - likely field-name drift risk
- Why it matters: live map must not imply realtime truth from the wrong source tables.

7. **Analytics is acceptable but narrow**
- File: `apps/ops-admin/src/app/dashboard/analytics/page.tsx`
- Business question: what do the recent business metrics say?
- Current state:
  - real current data
  - simplistic summaries only
  - clearly marked placeholder chart area
- Why it matters: less urgent than delivery/driver/support because it is already mostly honest.

## Page-By-Page Notes

### `/dashboard/orders/[id]`
- Uses shared read helpers? No.
- Displays real operational truth? Partly yes.
- Actions real? Yes, via `OrderStatusActions` and `/api/engine/orders/[id]`.
- Operator usefulness: medium-high; needs richer oversight context.

### `/dashboard/deliveries/[id]`
- Uses shared read helpers? No.
- Displays real operational truth? Partial.
- Actions real? No, currently cosmetic.
- Operator usefulness: low relative to importance; highest-value repair target.

### `/dashboard/drivers/[id]`
- Uses shared read helpers? No.
- Displays real operational truth? Partial.
- Actions real? No, currently cosmetic.
- Operator usefulness: low-medium; second-tier repair target.

### `/dashboard/customers/[id]`
- Uses shared read helpers? No.
- Displays real operational truth? Partial.
- Actions real? No, currently cosmetic.
- Operator usefulness: medium-low; after driver detail.

### `/dashboard/support`
- Uses shared read helpers? Indirectly through API and shared support repo.
- Displays real operational truth? Yes, but shallow.
- Actions real? Resolve is real.
- Operator usefulness: medium; needs queue summaries and clearer next-action framing.

### `/dashboard/analytics`
- Uses shared read helpers? No.
- Displays real operational truth? Yes, mostly.
- Actions real? Not applicable.
- Operator usefulness: medium; honest enough for now.

### `/dashboard/map`
- Uses shared read helpers? No.
- Displays real operational truth? Uncertain because of likely schema drift.
- Actions real? Not an action page.
- Operator usefulness: uncertain until source model is aligned.

## Highest-Value Fixes For This Pass

1. Normalize delivery detail into a real dispatch/intervention page using shared read helpers and real dispatch actions.
2. Normalize driver detail into a real ops oversight page with actual status controls and recent deliveries.
3. Normalize customer detail into a real ops context page, removing fake actions and improving order/support context.
4. Improve support queue with operational summaries and clearer status/action framing.
5. Make map and analytics honest where capabilities are incomplete or source tables are drifting.
