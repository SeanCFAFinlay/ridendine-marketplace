# Chef / vendor operations flow (Phase 7)

**App:** `apps/chef-admin` (port 3001).  
**Aligns with:** [`docs/ORDER_FLOW.md`](ORDER_FLOW.md), [`docs/BUSINESS_ENGINE_FOUNDATION.md`](BUSINESS_ENGINE_FOUNDATION.md), [`docs/CUSTOMER_ORDERING_FLOW.md`](CUSTOMER_ORDERING_FLOW.md), [`docs/DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

---

## App responsibility

- Authenticated **chef** users manage **one storefront** per profile (see `getChefActorContext` in `apps/chef-admin/src/lib/engine.ts`).
- Menu, storefront metadata, **weekly hours** (`chef_availability`), orders, payouts, and reviews are chef-admin concerns.
- **Order status mutations** go through **`getEngine().orders.*`** in `apps/chef-admin/src/app/api/orders/[id]/route.ts` (accept, reject, preparing, ready, etc.) — not ad-hoc status writes from UI.
- **Marketplace visibility** (`chef_storefronts.is_active`) is **not** chef-editable in API (ops governs publication) — see `PATCH /api/storefront`.

---

## Source of truth (actual schema)

| Concept | Table(s) | Notes |
|---------|-----------|--------|
| **Chef identity / approval** | `chef_profiles` | `status`: pending, approved, rejected, suspended — **customer checkout requires `approved`**. |
| **Kitchen / location** | `chef_kitchens` | Linked from `chef_storefronts.kitchen_id`. |
| **Customer-facing storefront** | `chef_storefronts` | `is_active`, `is_paused`, queue fields, slug, menu linkage. |
| **Weekly hours** | `chef_availability` | `storefront_id`, `day_of_week` (0–6, JS Sunday=0), `start_time`, `end_time`, `is_available`. **UNIQUE(storefront_id, day_of_week)**. |
| **Menu structure** | `menu_categories`, `menu_items` | `menu_items.is_available`, `is_sold_out`; category `is_active`. |
| **Item time overrides** | `menu_item_availability` | Exists in schema; **no chef-admin editor in Phase 7** — future phase. |
| **Orders** | `orders`, `order_items`, `order_status_history` | Engine / master-order-engine own transitions where wired. |

---

## Routes (chef-admin)

| Path | Role |
|------|------|
| `/auth/login`, `/auth/signup` | Chef auth |
| `/dashboard` | Home |
| `/dashboard/orders` | Incoming orders |
| `/dashboard/menu` | Menu CRUD via `/api/menu` |
| `/dashboard/storefront` | Storefront setup + PATCH `/api/storefront` |
| **`/dashboard/availability`** | **Weekly hours** — GET/PUT `/api/storefront/availability` (Phase 7) |
| `/dashboard/payouts`, `/dashboard/reviews`, … | Other domains |

---

## API endpoints (chef)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET/PATCH | `/api/storefront` | Chef + storefront | Read/update storefront (not `is_active`) |
| **GET/PUT** | **`/api/storefront/availability`** | **Chef + storefront** | **Read/write `chef_availability` rows** |
| GET/POST | `/api/menu`, `/api/menu/[id]`, `/api/menu/categories` | Chef | Menu |
| GET/PATCH | `/api/orders`, `/api/orders/[id]` | Chef | List / transition orders via **engine** |

---

## Customer checkout dependency (Phase 7 guard)

- **`KitchenEngine.validateCustomerCheckoutReadiness(storefrontId, menuItemIds)`** (`packages/engine/src/orchestrators/kitchen.engine.ts`) enforces:
  - Storefront exists, **`is_active`**, **not `is_paused`**
  - Chef profile **`status === 'approved'`**
  - If **any** `chef_availability` rows exist for the storefront → **today’s** row must exist, `is_available`, and current **local server time** must fall in `[start_time, end_time)` (see `evaluateWeeklyAvailability` in `kitchen-availability.ts`).
  - All **menu items** must belong to storefront, `is_available`, not sold out, active category.
- **Web** `POST /api/checkout` and **`POST /api/cart`** call this guard before order creation / add-to-cart.

**Caveats:** Timezone for weekly hours is **server local** + browser local for chef UI inputs — document for Phase 11/ops if per-store TZ needed. **`menu_item_availability`** not enforced in Phase 7.

---

## Phase 6 follow-up (chef signup)

- Public **`/chef-signup`** on web links to **`{NEXT_PUBLIC_CHEF_ADMIN_URL}/auth/signup`** — see [`docs/CUSTOMER_ORDERING_FLOW.md`](CUSTOMER_ORDERING_FLOW.md).

---

## Remaining work

| Phase | Topic |
|-------|--------|
| **10** | Ops approvals, admin overrides, audit depth |
| **11** | Realtime order board + TZ-aware hours if required |
| **12** | Notifications / support escalations |

---

*Phase 7 deliverable — chef flow + customer guard alignment without changing driver/ops apps.*
