# Ops-Admin Engine Audit

Date: 2026-04-04

## Guardrails

These prior working governance paths must not regress:

- Ops-admin owns chef approval, rejection, suspension, and restore via shared engine methods.
- Ops-admin owns storefront publish, unpublish, pause, and unpause via shared engine methods.
- Chef-admin cannot self-publish storefront visibility.
- Web reads governed public storefront truth only.
- Finance page uses real ledger, refund, and payout-adjustment data.
- Engine-backed order, delivery, and refund governance remains authoritative.

Files outside `apps/ops-admin`, `packages/db`, `packages/engine`, and `docs/business-rules` should remain untouched in this pass unless a minimal compatibility fix is unavoidable.

## 1. Ops-Admin Route Map

### Dashboard Pages

- `/dashboard`
  - Purpose: command center summary
  - Data source: direct Supabase reads plus partial shared db helper usage
  - Status: working but structurally weak
- `/dashboard/orders`
  - Purpose: order oversight and action surface
  - Data source: `/api/orders`
  - Status: working, useful, but read model is direct-query based
- `/dashboard/orders/[id]`
  - Purpose: order detail and engine-backed actions
  - Data source: order detail page + `/api/engine/orders/[id]`
  - Status: working and authoritative
- `/dashboard/deliveries`
  - Purpose: dispatch oversight and assignment
  - Data source: `/api/deliveries`, `/api/drivers`, `/api/engine/dispatch`
  - Status: working, action path is authoritative, read model is only moderately useful
- `/dashboard/deliveries/[id]`
  - Purpose: delivery detail
  - Status: route exists; not audited deeply in this phase
- `/dashboard/chefs`
  - Purpose: chef governance overview
  - Data source: `/api/chefs`
  - Status: working and improved in prior pass
- `/dashboard/chefs/approvals`
  - Purpose: pending chef approval queue
  - Data source: `/api/chefs?status=pending`
  - Status: working and authoritative
- `/dashboard/chefs/[id]`
  - Purpose: chef + storefront governance detail
  - Data source: shared db helpers + engine-backed actions
  - Status: working and authoritative
- `/dashboard/drivers`
  - Purpose: driver oversight
  - Data source: `/api/drivers`
  - Status: partially useful, but contains fake admin-created driver flow
- `/dashboard/drivers/[id]`
  - Purpose: driver detail
  - Status: route exists; not deeply normalized yet
- `/dashboard/customers`
  - Purpose: customer oversight
  - Data source: `/api/customers`
  - Status: partially useful, but contains fake admin-created customer flow
- `/dashboard/customers/[id]`
  - Purpose: customer detail
  - Status: route exists; not deeply normalized yet
- `/dashboard/support`
  - Purpose: support queue
  - Data source: `/api/support`
  - Status: useful queue surface, but API auth and action gating are weak
- `/dashboard/finance`
  - Purpose: finance oversight hub
  - Data source: shared db helpers + commerce engine summary
  - Status: working and authoritative
- `/dashboard/settings`
  - Purpose: platform controls
  - Data source: local client state only
  - Status: cosmetic / non-authoritative
- `/dashboard/analytics`
  - Purpose: analytics reporting
  - Status: exists, not the focus of this pass
- `/dashboard/map`
  - Purpose: live map / dispatch context
  - Status: exists, not the focus of this pass

### API Surface

- `/api/chefs`, `/api/chefs/[id]`
  - Governance reads and engine-backed chef actions
  - Status: authoritative
- `/api/engine/storefronts/[id]`
  - Engine-backed storefront governance
  - Status: authoritative
- `/api/orders`, `/api/orders/[id]`
  - Legacy ops reads and compatibility action surface
  - Status: mixed; detail action path has been repaired, list read remains direct-query based
- `/api/engine/orders/[id]`
  - Primary engine-backed order oversight actions
  - Status: authoritative
- `/api/deliveries`, `/api/deliveries/[id]`
  - Delivery read and compatibility action surface
  - Status: mixed; dispatch action path is authoritative through `/api/engine/dispatch`
- `/api/engine/dispatch`
  - Manual dispatch ownership
  - Status: authoritative
- `/api/drivers`, `/api/drivers/[id]`
  - Driver reads and direct status updates
  - Status: partially authoritative; create flow is weak
- `/api/customers`
  - Customer reads and direct create flow
  - Status: partially authoritative; create flow is weak
- `/api/support`, `/api/support/[id]`
  - Support queue reads and updates
  - Status: weak because auth/role checks are missing
- `/api/engine/finance`, `/api/engine/refunds`, `/api/orders/[id]/refund`
  - Finance and refund actions
  - Status: authoritative
- `/api/engine/dashboard`, `/api/engine/exceptions`, `/api/engine/exceptions/[id]`
  - Engine dashboard / incident surfaces
  - Status: available but not yet the main source for overview pages

## 2. Ops-Admin Action Map

- Chef approve / reject / suspend / restore
  - Page/API: `/dashboard/chefs`, `/dashboard/chefs/approvals`, `/dashboard/chefs/[id]` -> `/api/chefs/[id]`
  - Shared authority: `packages/engine/src/orchestrators/platform.engine.ts`
  - Status: real and engine-backed
- Storefront publish / unpublish / pause / unpause / queue controls
  - Page/API: chef detail -> `/api/engine/storefronts/[id]`
  - Shared authority: `platform.engine`
  - Status: real and engine-backed
- Order oversight actions
  - Page/API: `/dashboard/orders`, `/dashboard/orders/[id]` -> `/api/engine/orders/[id]`
  - Shared authority: order / platform engine methods
  - Status: real and engine-backed
- Driver assignment
  - Page/API: `/dashboard/deliveries` -> `/api/engine/dispatch`
  - Shared authority: dispatch engine
  - Status: real and engine-backed
- Driver status update
  - Page/API: `/dashboard/drivers` -> `/api/drivers/[id]`
  - Shared authority: direct db repository update
  - Status: real but not yet normalized under shared ops read/governance structure
- Support resolution
  - Page/API: `/dashboard/support` -> `/api/support/[id]`
  - Shared authority: direct db repository update
  - Status: real data write, but auth/role enforcement is weak
- Finance review
  - Page/API: `/dashboard/finance`
  - Shared authority: commerce engine + shared finance repos
  - Status: real and authoritative

## 3. Ops-Admin Business Ownership Map

Ops-admin currently owns these platform-wide business concerns in code:

- Chef governance
- Storefront governance
- Order oversight and intervention
- Dispatch oversight and assignment
- Delivery oversight
- Refund review visibility and action paths
- Platform finance oversight
- Support oversight

Ops-admin is still weak or incomplete in these areas:

- Driver lifecycle governance is functional but not yet structurally aligned with engine-first patterns
- Customer oversight is readable but not honestly scoped because it still exposes admin-created customer UI
- Settings / platform controls are not backed by real persisted platform rules
- Dashboard overview is only partially grounded in engine-native summary models

## 4. Weak Points

### Highest-Value Structural Weaknesses

1. Dashboard summary is partly direct-query and partly placeholder
- `apps/ops-admin/src/app/dashboard/page.tsx`
- Problems:
  - hardcoded `avgDeliveryTime`
  - synthetic `platformFee` derived from revenue * 0.15 instead of real finance summary
  - mixed direct reads with partial helper usage
- Why it matters: the command center should represent actual operational truth

2. Drivers page presents fake authority
- `apps/ops-admin/src/app/dashboard/drivers/page.tsx`
- `apps/ops-admin/src/app/api/drivers/route.ts`
- Problems:
  - “Add Driver” creates partial `drivers` rows with `user_id = null`
  - this bypasses driver onboarding and creates non-real platform state
- Why it matters: ops should govern real drivers, not invent incomplete records

3. Customers page presents fake authority
- `apps/ops-admin/src/app/dashboard/customers/page.tsx`
- `apps/ops-admin/src/app/api/customers/route.ts`
- Problems:
  - “Add Customer” creates partial `customers` rows with `user_id = null`
  - this bypasses real customer acquisition and ordering flow
- Why it matters: ops should oversee customers, not fabricate customer identities

4. Support APIs are missing ops auth / role gating
- `apps/ops-admin/src/app/api/support/route.ts`
- `apps/ops-admin/src/app/api/support/[id]/route.ts`
- Problems:
  - no `getOpsActorContext()` check
  - no role verification
- Why it matters: support actions should be ops-owned and auditable, not anonymously callable server routes

5. Settings page is cosmetic
- `apps/ops-admin/src/app/dashboard/settings/page.tsx`
- Problems:
  - local state only
  - fake save success
  - no platform rule persistence
- Why it matters: page looks authoritative but is not a real control surface

## 5. Highest-Value Fixes To Make Now

1. Normalize dashboard overview around real shared data
- Replace synthetic platform summary values with shared engine/db truth where available
- Remove clearly fake derived metrics that imply authority

2. Make drivers and customers oversight honest
- Remove fake “Add Driver” / “Add Customer” control flows
- Reframe pages as oversight surfaces over real entities
- Keep status governance actions where they are backed by real records

3. Lock support behind ops auth and role checks
- Add `getOpsActorContext()` enforcement to support APIs
- Preserve direct support ticket updates for now, but make ownership real

4. Make settings honest
- Convert settings page from fake control panel to explicit platform configuration status / debt page unless a real persisted model already exists

These changes keep scope ops-admin only, improve business truth, and avoid reopening working governance paths.
