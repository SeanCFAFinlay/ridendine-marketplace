# Real-time event system (Phase 11)

This document is the **contract** for Supabase Realtime usage across Ridendine apps: **what** we listen to, **how** channels are named, **who** may receive which payloads, and **how** we fail when data is malformed.

**Implementation helpers:** `@ridendine/db` exports `useRealtimeSubscription`, `packages/db/src/realtime/channels.ts`, and `packages/db/src/realtime/events.ts` (typed parsers, fail-closed).

---

## 1. Sources of truth

| Layer | Role |
|-------|------|
| **Postgres + RLS** | Authoritative rows (`orders`, `deliveries`, `notifications`, `system_alerts`, …). `postgres_changes` streams **only** rows the subscriber’s JWT may read. |
| **`domain_events` table** | Append-only audit stream written by **`DomainEventEmitter`** (`packages/engine/src/core/event-emitter.ts`) on engine flush; optional **broadcast** to `events:{entityType}` and `entity:{entityType}:{entityId}` after insert (engine naming uses **`events:`** prefix — distinct from customer **`order:`** / **`delivery:`** helpers in `@ridendine/db` which target UI listeners). |
| **Broadcast channels** | Used for coarse-grained updates (e.g. customer map tracking) where postgres replication is not configured or payloads are synthesized server-side. |

**Rule:** UI must not treat realtime as authoritative for money or legal state — refetch or use existing REST/API routes when correctness matters.

---

## 2. Channel naming convention

| Pattern | Owner | Example |
|---------|-------|---------|
| `order:{orderId}` | Customer / ops detail | Single-order context |
| `chef:{storefrontId}:orders` | Chef admin | Pair with **`filter: storefront_id=eq.{storefrontId}`** on `orders` |
| `driver:{driverId}:assignments` | Driver app | Reserved for assignment stream (no native subscription in repo yet) |
| `ops:orders` | Ops dashboard | Postgres `orders` (platform JWT) |
| `ops:alerts` | Ops alerts bell | Postgres `system_alerts` inserts |
| `ops:map:presence` | Ops live map | Postgres `driver_presence` + `deliveries` |
| `support:tickets` | Support | Reserved naming; wire in Phase 12 |
| `delivery:{deliveryId}:tracking` | Customer tracking | **Preferred** new name |
| `tracking:{deliveryId}` | Customer tracking | **Legacy** broadcast bucket (keep for backward compatibility) |
| `entity:delivery:{deliveryId}` | Customer tracking | Secondary broadcast bucket |

Stable **postgres** listener ids: `pg:{schema}:{table}:{event}:{encodedFilter}` (see `postgresTableChannelId`).

---

## 3. Event type catalog

### 3.1 Canonical strings (`DomainEventType` in `@ridendine/types`)

Engine-emitted types already use dotted ids, e.g. `order.created`, `order.accepted`, `payment.confirmed`, `refund.processed`, `ops.override.executed`, `storefront.closed`, `menu.item.sold_out`, `driver_location_updated`, `delivery.picked_up`, etc. See `packages/types/src/engine/index.ts` **`DomainEventType`**.

### 3.2 Phase 11 “category” checklist (doc / product language → type)

| Category (spec) | Canonical `DomainEventType` or notes |
|-----------------|--------------------------------------|
| order.created | `order.created` |
| order.accepted | `order.accepted` |
| order.rejected | `order.rejected` |
| order.preparing | `order.prep_started` |
| order.ready | `order.ready` |
| delivery.assigned | `driver.assigned` / `delivery.created` (lifecycle) |
| delivery.picked_up | `delivery.picked_up` |
| delivery.location_updated | `driver_location_updated` |
| delivery.delivered | `delivery.completed` |
| payment.confirmed | `payment.confirmed` |
| refund.created | `refund.requested` (request) / `refund.processed` (settled) |
| kitchen.closed | `storefront.closed` |
| menu.item_unavailable | `menu.item.sold_out` |
| support.ticket_created | **Not yet** a `DomainEventType` — **Phase 12** (notifications + support RLS) |
| admin.override_applied | `ops.override.executed` |

---

## 4. Payload shape

### 4.1 `postgres_changes`

Supabase delivers `RealtimePostgresChangesPayload<T>` with `new` / `old` row snapshots. Apps must run **`parseOrdersRealtimeRow`** (or equivalent) on `payload.new` before merging into React state. **Null → ignore** (fail closed).

### 4.2 Broadcast / domain flush

Engine broadcast sends `{ type: 'broadcast', event: <DomainEventType>, payload: DomainEvent }`. Clients may use **`parseBroadcastEnvelope`** for ad-hoc broadcast listeners; unknown `event` strings should be **ignored** (no throw).

---

## 5. Which app subscribes to what

| App | Subscriptions | Privacy |
|-----|---------------|---------|
| **web** | `notifications` (INSERT, scoped by `user_id=eq.{id}` filter + RLS), order tracking broadcasts on `tracking:{deliveryId}` | No cross-user notification access; **note:** `apps/web` still uses a narrow **`as any`** escape hatch for `notifications` **mutations** (`is_read`) because the generated client’s update chain currently resolves to **`never`** — realtime subscription itself remains typed on `postgres_changes`. |
| **chef-admin** | `orders` with **`storefront_id=eq.{id}`** | Chef never subscribes without storefront filter |
| **driver-app** | *(none today)* | Future: `driver:{id}:assignments` + minimal location egress |
| **ops-admin** | `orders`, `system_alerts`, `driver_presence`, `deliveries` | Platform roles only; still avoid echoing full PII into logs |

---

## 6. Auth / role rules

- **Anon key + user JWT:** RLS on tables determines visible realtime rows.
- **Service role** must **not** ship to browsers.
- Ops-wide postgres channels assume **`platform_users`**-backed sessions and policies that restrict reads.

---

## 7. Retry / reconnect / failure

- Supabase client auto-reconnects channels.
- **Stable channel names** prevent duplicate subscriptions on React strict-mode remount (`useRealtimeSubscription` / dashboard hooks).
- **Degraded UI:** If `createBrowserClient()` returns null (missing env), dashboards show offline / fetch-only messaging.
- **Malformed payloads:** Parsed as **null** and skipped — no state update, no throw.

---

## 8. Phase 12 — Notifications / support

- Durable in-app + email/push delivery, **`support.ticket_created`** domain type, ticket assignment RLS, correlation with `domain_events`.
- Realtime may **signal** new rows; notifications engine remains **source** for external delivery.

---

## 9. IRR-010 resolution

- Removed **`postgres_changes` as any** from `useRealtimeSubscription` (`packages/db/src/hooks/use-realtime.ts`).
- Centralized channel naming and **typed, fail-closed parsers** in `packages/db/src/realtime/*`.
