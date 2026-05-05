# Driver / delivery flow (Phase 8)

**App:** `apps/driver-app` (port 3003, PWA).  
**Aligns with:** [`docs/ORDER_FLOW.md`](ORDER_FLOW.md), [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md), [`docs/DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md), [`docs/AUTH_ROLE_MATRIX.md`](AUTH_ROLE_MATRIX.md).

---

## App responsibility

- Authenticated users with a **`drivers`** row use the portal; **dispatch-sensitive APIs** require **`drivers.status === 'approved'`** (`getDriverActorContext()` default).
- **Profile** `GET`/`PATCH` `/api/driver` uses `getDriverActorContext({ requireApproved: false })` so pending drivers can maintain their profile; updates are still **scoped to their own** `driver.id` via admin client.
- **Presence**, **location**, **offers**, **deliveries**, **earnings** require an **approved** driver and enforce **ownership** in route or **`DispatchEngine`**.
- **Order / delivery status changes** go through **`getEngine().dispatch`** / **`engine.platform.completeDeliveredOrder`** — not invented in UI.

---

## Source of truth (schema-aligned)

| Concept | Table(s) | Notes |
|---------|-----------|--------|
| **Driver identity / approval** | `drivers` | `user_id`, `status` (pending, approved, rejected, suspended). |
| **Presence / last location** | `driver_presence` | `status` (offline, online, busy), `current_lat` / `current_lng`, timestamps. |
| **Offers / assignment attempts** | `assignment_attempts` | Pending offers per `driver_id`; `response`, `expires_at`. |
| **Delivery lifecycle** | `deliveries` | `driver_id`, `status`, pickup/dropoff fields, payout. |
| **Location history** | `driver_locations` | Append-only pings per driver. |
| **Tracking / customer map** | `delivery_tracking_events` | Written only when `deliveryId` is set, delivery is **assigned to this driver**, and status is in an **active** leg. |
| **Status / audit trail** | `delivery_events` | Written by **`DispatchEngine.updateDeliveryStatus`** (engine path). |
| **Orders** | `orders`, `order_items` | Order lifecycle owned by engine / master order flow — driver app does not PATCH `orders` directly. |

---

## Routes (driver-app)

| Path | Role |
|------|------|
| `/auth/login`, `/auth/signup` | Public |
| `/` | Dashboard (approved only on server; pending sees “Awaiting approval”) |
| `/delivery/[id]` | Active delivery (must be **assigned to driver** or have **pending offer**) |
| `/history`, `/earnings`, `/profile` | Authenticated driver UX |

---

## API endpoints

| Method | Path | Auth | Rate limit / notes |
|--------|------|------|---------------------|
| GET/PATCH | `/api/driver` | Session + driver row | PATCH scoped to own id; pending allowed. |
| GET/PATCH | `/api/driver/presence` | Approved driver | Engine audit + events on PATCH. |
| POST | `/api/location` | Approved driver | **`checkRateLimit`** on `driver:{id}` with **`RATE_LIMITS.driverLocation`** (24/min per instance, token bucket). Optional `recordedAt` must pass **`isPlausibleClientIsoTime`**. Rejects **(0,0)**. **429** + `Retry-After`. Unauthenticated abuse uses **`RATE_LIMITS.auth`** keyed by IP (light). |
| GET/POST | `/api/offers` | Approved driver | Lists `assignment_attempts` for this `driver_id` only. |
| GET | `/api/deliveries` | Approved driver | **`getActiveDeliveriesForDriver`**(admin, `driverId`). |
| GET/PATCH | `/api/deliveries/[id]` | Approved driver | GET/PATCH: **ownership** via `verifyDriverOwnsDelivery` or engine for offers. Customer **`last_name`** omitted from GET select (privacy). |
| GET | `/api/earnings` | Approved driver | History limited to **`driver_id`** via `getDeliveryHistory`. |

---

## Location update rules

- Body validated with **`locationUpdateSchema`** (`@ridendine/validation`): lat/lng range, optional accuracy/heading/speed, optional `deliveryId`.
- **Rate limit:** `@ridendine/utils` **`checkRateLimit`** + **`RATE_LIMITS.driverLocation`** — evidenced in code and unit tests (not distributed across instances; document **Upstash** for Phase 17 if needed).
- **Errors:** do not log raw coordinates on failure — message-only `console.error`.
- **Tracking events:** only if `deliveryId` matches a delivery **assigned to this driver** and status is in the active list.

---

## Customer privacy

- **GET `/api/deliveries/[id]`** returns `customers.first_name` and **`phone`** for operational contact; **`last_name`** is not selected (reduces PII surface).
- **Offers** expose pickup/dropoff addresses and payout — required for accept/decline; full **customer profile** is not returned.
- **Server delivery page** loads order + `customer_addresses` only after **assignment or pending-offer** check (admin-backed ownership gate).
- Driver **GPS** is not exposed via a public API; engine emits domain events for authorized tracking consumers (Phase 11).

---

## Auth / ownership summary

| Check | Where |
|-------|--------|
| Approved for dispatch | `getDriverActorContext()` default; `POST /api/location` |
| Own delivery | `verifyDriverOwnsDelivery`; `DispatchEngine.updateDeliveryStatus` compares `drivers.id` to `deliveries.driver_id` |
| Own offer | `acceptOffer` / `declineOffer` compare attempt `driver_id` |
| Delivery page | Admin fetch + `driver_id === driver.id` **or** pending `assignment_attempts` row |

---

## Remaining work by phase

| Phase | Topic |
|-------|--------|
| **10** | Ops dispatch overrides, manual assign UI, SLA dashboards |
| **11** | Realtime offer board, live map, optional **Redis** rate limits |
| **12** | Customer notifications, support exceptions from driver-offline path |

---

*Phase 8 — IRR-019 rate limit + ownership/privacy hardening without changing web/chef/ops apps or payments.*
