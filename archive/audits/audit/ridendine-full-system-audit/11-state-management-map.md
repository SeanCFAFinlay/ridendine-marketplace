# 11 - State Management Map

**Audit Date**: 2026-04-23
**Scope**: Client-side state, server-side state, realtime subscriptions, engine state machines
**Status**: FUNCTIONAL BUT MINIMAL - no global state library; realtime largely unused

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Client-Side State](#client-side-state)
3. [Server-Side State](#server-side-state)
4. [Engine State Machines](#engine-state-machines)
5. [Realtime Subscriptions](#realtime-subscriptions)
6. [State Gaps and Risks](#state-gaps-and-risks)

---

## Architecture Overview

```
Client State          Server State            Engine State
─────────────         ────────────            ────────────
CartContext           Supabase (PostgreSQL)   OrderOrchestrator
AuthProvider          DomainEventEmitter      DeliveryOrchestrator
Local component       AuditLogger             FinanceOrchestrator
  state (forms,       SLAManager              AssignmentEngine
  modals, filters)
URL state
  (search/filters)
```

No global state management library (Redux, Zustand, Jotai, Recoil) is used. All persistent state lives in Supabase. Client state is scoped to React context and component-local state.

---

## Client-Side State

### CartContext (apps/web)

**File**: `apps/web/src/contexts/CartContext.tsx`
**Pattern**: React Context + useReducer

Actions handled:
- `ADD_ITEM` — adds item to cart, creates cart record if not exists
- `REMOVE_ITEM` — removes item from cart
- `UPDATE_QUANTITY` — updates item quantity
- `CLEAR_CART` — empties cart after checkout
- `LOAD_CART` — hydrates from Supabase on mount

State shape:
```typescript
{
  cartId: string | null;
  chefId: string | null;
  items: CartItem[];
  isLoading: boolean;
}
```

**Persistence**: Cart state is persisted to Supabase (`carts`, `cart_items` tables) on every mutation. The context syncs with the database as the source of truth.

**Cross-chef enforcement**: When adding an item from a different chef than items already in the cart, the user is prompted to clear the cart. This logic is in the reducer.

**Gap**: No optimistic updates. Every cart action waits for the Supabase write to complete before updating UI. This creates visible latency on slow connections.

### AuthProvider (All Apps)

**File**: `packages/auth/src/AuthProvider.tsx` (shared)
**Pattern**: React Context wrapping Supabase session

Provides:
- `user` — Supabase Auth user object
- `session` — full session with tokens
- `isLoading` — true during initial session check
- `signOut()` — signs out and clears session

Each app wraps its root layout with `<AuthProvider>`. All components needing auth state use `useAuth()` hook.

**No role information**: AuthProvider does not provide role data. Components needing role-specific behavior query the appropriate table separately (chef_profiles, drivers, etc.).

### Local Component State

All other client state is component-local via `useState` and `useReducer`:

| State Type | Pattern | Apps |
|------------|---------|------|
| Form state | Uncontrolled with react-hook-form | All |
| Modal open/close | `useState(boolean)` | All |
| Filter/sort state | `useState` | All |
| Pagination | `useState(page)` | All |
| Data fetching | `useState` + `useEffect` + Supabase query | All |
| Loading indicators | `useState(boolean)` | All |

No data fetching library (SWR, React Query, TanStack Query) is used. Data fetching is manual `useEffect` + `useState` patterns throughout. This means:
- No automatic cache invalidation
- No background refetching
- No deduplication of identical requests
- No stale-while-revalidate behavior

### URL State

Search and filter parameters are persisted in URL query strings using Next.js `useSearchParams()` and `useRouter()`. This pattern is used in:
- `apps/web` — storefront search, filter by cuisine
- `apps/ops-admin` — order list filters, date range pickers
- `apps/chef-admin` — order history filters

---

## Server-Side State

All authoritative state lives in Supabase (PostgreSQL). Server-side state management is handled through Next.js Server Components and API routes.

### Next.js Server Components

Pages that render server-side use Supabase server client to fetch data at request time:
- Storefront listing pages in `apps/web`
- Chef dashboard data in `apps/chef-admin`
- Ops overview pages in `apps/ops-admin`

These are stateless per-request; no server-side caching layer is in place.

### API Routes as State Mutators

All state mutations go through Next.js API routes which call engine orchestrators:

```
Client Action → API Route → Engine Orchestrator → Repository → Supabase
```

This ensures business logic runs server-side and state is always consistent.

---

## Engine State Machines

The engine package (`packages/engine`) manages domain state via orchestrators. These are the authoritative state machines for the platform.

### Order State Machine

**File**: `packages/engine/src/orchestrators/order.orchestrator.ts`

States and transitions:

```
pending
  └─→ confirmed (chef accepts)
        └─→ preparing (chef starts cooking)
              └─→ ready (chef marks ready)
                    └─→ picked_up (driver picks up)
                          └─→ delivered
                    └─→ cancelled (timeout or manual)
  └─→ cancelled (chef rejects or customer cancels before confirm)
```

- Each transition is guarded by actor role checks
- `order_status_history` is written on every transition
- Engine emits domain events (though `domain_events` table is unused — see file 08)

### Delivery State Machine

**File**: `packages/engine/src/orchestrators/delivery.orchestrator.ts`

States:
```
unassigned
  └─→ offered (offer sent to driver)
        └─→ accepted (driver accepts)
              └─→ en_route_pickup
                    └─→ picked_up
                          └─→ en_route_dropoff
                                └─→ delivered
        └─→ rejected (driver rejects → re-offer)
  └─→ failed (no driver accepted within timeout)
```

- `assignment_attempts` table tracks each offer attempt
- SLA timer logic exists in `SLAManager` but `sla_timers` table is unused

### Finance State Machine

**File**: `packages/engine/src/orchestrators/finance.orchestrator.ts`

Manages:
- `ledger_entries` creation on order completion
- `refund_cases` creation and status tracking
- `chef_payout_accounts` balance tracking
- `payout_adjustments` for manual corrections

---

## Realtime Subscriptions

Supabase Realtime is available but minimally used across the platform:

### Active Subscriptions

| App | Component | Table | Event Type | Update Interval |
|-----|-----------|-------|-----------|-----------------|
| `apps/chef-admin` | Order list page | `orders` | `postgres_changes` (INSERT, UPDATE) | Event-driven |

This is the only true Realtime subscription in the codebase.

### Polling (Not Realtime)

| App | Component | Table | Method | Interval |
|-----|-----------|-------|--------|----------|
| `apps/web` | Order tracking page | `driver_presence` | `setInterval` + Supabase query | 15 seconds |

The order tracking page polls for driver location every 15 seconds instead of using a Realtime subscription. This is functionally adequate but less efficient.

### No Subscriptions

| App | Expected Use Case | Status |
|-----|------------------|--------|
| `apps/ops-admin` | Live order board updates | None |
| `apps/driver-app` | New delivery offer alerts | None (relies on user-initiated refresh) |
| `apps/web` | Order status changes | None (relies on polling or page refresh) |

The driver app's lack of push/realtime is particularly impactful: drivers must manually refresh the app to see new delivery offers. In production this would cause missed deliveries.

---

## State Gaps and Risks

| Gap | Severity | Impact | Fix |
|-----|----------|--------|-----|
| No realtime in driver app | HIGH | Drivers miss delivery offers | Add Supabase Realtime subscription on assignment_attempts |
| No realtime in ops-admin order board | MEDIUM | Ops agents see stale data | Add postgres_changes subscription on orders |
| No optimistic updates in cart | MEDIUM | Visible latency on cart actions | Add optimistic state updates with rollback |
| No data fetching library | MEDIUM | No caching, no background refresh, no deduplication | Adopt TanStack Query or SWR |
| Manual useEffect data fetching | MEDIUM | Race conditions, inconsistent loading states | Centralize via data fetching layer |
| SLA timers unused | HIGH | Order/delivery SLA violations not tracked | Wire SLAManager to sla_timers table |
| domain_events table unused | MEDIUM | Event sourcing disabled; no audit trail of state changes | Wire DomainEventEmitter to domain_events |
| No server-side cache | LOW | Repeated DB queries for same data | Add Redis or Next.js fetch cache layer |
