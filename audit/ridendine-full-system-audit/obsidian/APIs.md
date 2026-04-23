# APIs

All 49+ API routes across the 4 Ridendine applications.

Related: [[Home]] | [[Apps]] | [[Database]] | [[Roles]] | [[Integrations]]

---

## web - Customer App API Routes

| Route | Method | Auth | Status | DB Tables | Notes |
|-------|--------|------|--------|-----------|-------|
| `/api/chefs` | GET | None | Working | `chef_storefronts`, `chef_profiles` | List active storefronts |
| `/api/chefs/[slug]` | GET | None | Working | `chef_storefronts`, `menu_categories`, `menu_items` | Full menu with options |
| `/api/cart` | GET | Customer | Working | `carts`, `cart_items` | Get active cart |
| `/api/cart` | POST | Customer | Working | `carts`, `cart_items` | Add/update cart item |
| `/api/cart` | DELETE | Customer | Working | `cart_items` | Remove cart item |
| `/api/checkout` | POST | Customer | Working | `orders`, `order_items`, `carts` | Create order + PaymentIntent |
| `/api/orders` | GET | Customer | Working | `orders`, `order_items` | Order history |
| `/api/orders/[id]` | GET | Customer | Working | `orders`, `order_items`, `deliveries` | Single order detail |
| `/api/stripe/webhook` | POST | Stripe sig | Working | `orders` | Payment confirmation / failure |
| `/api/support` | POST | Customer | Working | `support_tickets` | Create support ticket |
| `/api/account` | GET | Customer | Working | `customers` | Customer profile |
| `/api/account` | PATCH | Customer | Working | `customers` | Update profile |
| `/api/account/addresses` | GET | Customer | Working | `customer_addresses` | List addresses |
| `/api/account/addresses` | POST | Customer | Working | `customer_addresses` | Add address |
| `/api/account/addresses/[id]` | DELETE | Customer | Working | `customer_addresses` | Remove address |
| `/api/favorites` | GET | Customer | Working | `favorites` | List favorites |
| `/api/favorites` | POST | Customer | Working | `favorites` | Toggle favorite |

---

## chef-admin - Chef Dashboard API Routes

| Route | Method | Auth | Status | DB Tables | Notes |
|-------|--------|------|--------|-----------|-------|
| `/api/orders` | GET | Chef | Working | `orders`, `order_items` | Chef's orders list |
| `/api/orders/[id]` | GET | Chef | Working | `orders`, `order_items` | Order detail |
| `/api/orders/[id]` | PATCH | Chef | Working | `orders`, `order_status_history` | Accept/reject/prepare/ready |
| `/api/menu` | GET | Chef | Working | `menu_categories`, `menu_items` | Full menu |
| `/api/menu/categories` | POST | Chef | Working | `menu_categories` | Add category |
| `/api/menu/categories/[id]` | PATCH | Chef | Working | `menu_categories` | Update category |
| `/api/menu/categories/[id]` | DELETE | Chef | Working | `menu_categories` | Delete category |
| `/api/menu/items` | POST | Chef | Working | `menu_items` | Add menu item |
| `/api/menu/items/[id]` | PATCH | Chef | Working | `menu_items`, `menu_item_options` | Update item + options |
| `/api/menu/items/[id]` | DELETE | Chef | Working | `menu_items` | Delete item |
| `/api/storefront` | GET | Chef | Working | `chef_storefronts` | Storefront settings |
| `/api/storefront` | PATCH | Chef | Working | `chef_storefronts`, `chef_availability`, `chef_delivery_zones` | Update storefront |
| `/api/analytics` | GET | Chef | Partial | `orders`, `order_items`, `reviews` | Chef analytics (incomplete) |
| `/api/payouts` | GET | Chef | Working | `chef_payout_accounts`, `driver_payouts` | Payout history |
| `/api/reviews` | GET | Chef | Working | `reviews` | Reviews received |

---

## ops-admin - Operations Admin API Routes

| Route | Method | Auth | Status | DB Tables | Notes |
|-------|--------|------|--------|-----------|-------|
| `/api/orders` | GET | Ops | Working | `orders` | All orders with filters |
| `/api/orders/[id]` | GET | Ops | Working | `orders`, `order_items`, `deliveries` | Full order detail |
| `/api/orders/[id]` | PATCH | Ops | Working | `orders` | Update order status |
| `/api/refund` | POST | Ops | Working | `orders` | Stripe refund (real) |
| `/api/chefs` | GET | Ops | Working | `chef_profiles`, `chef_storefronts` | All chefs |
| `/api/chefs/[id]` | GET | Ops | Working | `chef_profiles` | Chef detail |
| `/api/chefs/[id]` | PATCH | Ops | Working | `chef_profiles` | Approve/reject/suspend |
| `/api/drivers` | GET | Ops | Working | `drivers` | All drivers |
| `/api/drivers/[id]` | GET | Ops | Working | `drivers`, `driver_documents` | Driver detail |
| `/api/drivers/[id]` | PATCH | Ops | Working | `drivers` | Approve/reject/suspend |
| `/api/customers` | GET | Ops | Working | `customers` | All customers |
| `/api/customers/[id]` | GET | Ops | Working | `customers`, `orders` | Customer detail |
| `/api/deliveries` | GET | Ops | Working | `deliveries`, `orders` | All deliveries |
| `/api/deliveries/[id]` | GET | Ops | Working | `deliveries`, `delivery_events` | Delivery detail |
| `/api/deliveries/[id]` | PATCH | Ops | Working | `deliveries`, `delivery_assignments` | Assign driver |
| `/api/analytics` | GET | Ops | Partial | Multiple tables | Platform analytics |
| `/api/support` | GET | Ops | Working | `support_tickets` | Support ticket queue |
| `/api/support/[id]` | PATCH | Ops | Working | `support_tickets`, `admin_notes` | Resolve ticket |
| `/api/settings` | GET | Ops | Working | `platform_settings` | Platform settings |
| `/api/settings` | PATCH | Ops | Working | `platform_settings` | Update settings |

---

## driver-app - Driver App API Routes

| Route | Method | Auth | Status | DB Tables | Notes |
|-------|--------|------|--------|-----------|-------|
| `/api/deliveries` | GET | Driver | Working | `deliveries`, `delivery_assignments` | Available + active deliveries |
| `/api/deliveries/[id]` | GET | Driver | Working | `deliveries`, `orders` | Delivery detail with address |
| `/api/deliveries/[id]` | PATCH | Driver | Working | `deliveries`, `delivery_events` | Status updates (pickup, deliver) |
| `/api/location` | POST | Driver | Working | `driver_locations`, `driver_presence` | GPS position update |
| `/api/earnings` | GET | Driver | Working | `driver_earnings`, `driver_shifts` | Earnings breakdown |
| `/api/profile` | GET | Driver | Working | `drivers` | Driver profile |
| `/api/profile` | PATCH | Driver | Working | `drivers` | Update profile |

---

## API Status Summary

| Status | Count |
|--------|-------|
| Working | 45 |
| Partial | 2 |
| Missing | 2 |

## Missing APIs (Priority Gaps)

- `POST /api/orders/[id]/review` (web) - Customer review submission is not hooked to DB
- `GET /api/history` (driver) - History page has no backing API

See [[Risks#missing-apis]] for impact analysis. See [[Database]] for table relationships.
