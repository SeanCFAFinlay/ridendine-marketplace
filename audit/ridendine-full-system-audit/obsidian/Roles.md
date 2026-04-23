# Roles

All user roles in the Ridendine platform with capabilities and access boundaries.

Related: [[Home]] | [[Pages]] | [[APIs]] | [[Apps]]

---

## Customer

**Identity**: Registered consumer on ridendine.ca
**Auth**: Supabase email/password
**App**: [[Apps#web]]

### Capabilities
- Browse all active chef storefronts
- View menus and item details
- Add items to cart (one storefront per cart)
- Checkout and pay via Stripe
- Track order status
- Save delivery addresses
- Favorite chefs
- Leave reviews post-delivery
- Submit support tickets
- Manage account settings

### Accessible Pages
See [[Pages#web]] for full list. Key pages:
- `/chefs` - Browse
- `/cart` - Cart
- `/checkout` - Payment
- `/account/*` - Account management

### Accessible APIs
See [[APIs#web]] for full list. Key APIs:
- `GET /api/chefs` - Public browse
- `POST /api/checkout` - Order creation
- `GET /api/orders` - Own orders only
- `POST /api/stripe/webhook` - System-to-system only

### Data Owned
- `customers` row
- `customer_addresses` rows
- `carts` and `cart_items` rows
- `orders` (own only via RLS)
- `favorites` rows
- `reviews` rows

---

## Chef

**Identity**: Approved home chef on chef.ridendine.ca
**Auth**: Supabase email/password + chef role
**App**: [[Apps#chef-admin]]

### Capabilities
- Manage storefront (name, bio, hours, delivery zones)
- Build and maintain menu (categories, items, options, pricing)
- Receive and manage orders (accept, reject, prepare, mark ready)
- View customer reviews
- View earnings and payout history
- Manage availability schedule

### Lifecycle
`pending (signup)` → `approved (ops decision)` → active chef
Also: `rejected`, `suspended`

### Accessible Pages
See [[Pages#chef-admin]] for full list. Key pages:
- `/dashboard/orders` - Order queue
- `/dashboard/menu` - Menu management
- `/dashboard/storefront` - Settings

### Accessible APIs
See [[APIs#chef-admin]] for full list. Key APIs:
- `PATCH /api/orders/[id]` - Status transitions (accept → preparing → ready)
- `POST/PATCH /api/menu/items` - Menu CRUD

### Data Owned
- `chef_profiles` row
- `chef_storefronts` row
- `menu_categories`, `menu_items`, `menu_item_options` rows
- `chef_availability`, `chef_delivery_zones` rows

---

## Driver

**Identity**: Approved delivery driver on driver.ridendine.ca
**Auth**: Supabase email/password + driver role
**App**: [[Apps#driver-app]]

### Capabilities
- Set online/offline status
- Receive and respond to delivery offers
- Navigate to pickup location
- Confirm food pickup
- Navigate to delivery address
- Confirm delivery completion
- View earnings history
- Update vehicle and profile info

### Lifecycle
`pending (apply)` → `approved (ops decision)` → active driver
Also: `rejected`, `suspended`

### Accessible Pages
See [[Pages#driver-app]] for full list. Key pages:
- `/` - Active jobs / offers
- `/delivery/[id]` - Delivery flow

### Accessible APIs
See [[APIs#driver-app]] for full list. Key APIs:
- `PATCH /api/deliveries/[id]` - Status updates
- `POST /api/location` - GPS streaming

### Data Owned
- `drivers` row
- `driver_presence` row
- `driver_locations` rows
- `driver_earnings` rows

---

## Ops Admin

**Identity**: Platform operator on ops.ridendine.ca
**Auth**: Supabase email/password + platform_user role
**App**: [[Apps#ops-admin]]

### Capabilities
- Approve/reject/suspend chefs and drivers
- View all orders platform-wide
- Manually assign drivers to deliveries
- Process Stripe refunds
- Manage support tickets
- View live driver map (placeholder)
- View platform analytics
- Configure platform settings (fees, hours)
- Manage admin notes on any entity

### Access Level
Full platform read/write. Bypasses customer/chef RLS via service role or platform_users auth.

### Accessible Pages
See [[Pages#ops-admin]] for full list. Key pages:
- `/dashboard` - KPI overview
- `/dashboard/chefs/approvals` - Chef approval queue
- `/dashboard/deliveries/[id]` - Dispatch control

### Accessible APIs
See [[APIs#ops-admin]] for full list. Key APIs:
- `POST /api/refund` - Stripe refund
- `PATCH /api/chefs/[id]` - Chef governance
- `PATCH /api/deliveries/[id]` - Driver assignment

### Data Access
All tables (service-level access). Does not own data but can modify any record.

---

## System (Webhook)

**Identity**: Stripe webhook sender
**Auth**: Stripe-Signature header verification
**App**: web (receives) + engine (processes)

### Capabilities
- Trigger order payment confirmation
- Trigger order payment failure
- Trigger refund events

### Accessible APIs
- `POST /api/stripe/webhook` - Payment events only

---

## Role Summary

| Role | App | Auth Type | Maturity |
|------|-----|-----------|---------|
| Customer | web | Email/password | 80% |
| Chef | chef-admin | Email/password + role | 75% |
| Driver | driver-app | Email/password + role | 70% |
| Ops Admin | ops-admin | Email/password + platform_user | 60-70% |
| System | Webhook | Stripe signature | 100% |
