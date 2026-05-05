# Customer Domain

> Everything related to customer-facing functionality in the platform.

## Ownership

- **Primary App**: `apps/web` (port 3000)
- **DB Tables**: `customers`, `customer_addresses`, `carts`, `cart_items`, `orders` (create), `reviews` (create)
- **Repositories**: `customer.repository.ts`, `address.repository.ts`, `cart.repository.ts`
- **Validation**: `customer.ts` (schemas), `auth.ts` (login/signup)
- **Types**: `types/domains/customer.ts`

## User Journey

```
Sign Up → Browse Chefs → View Storefront → Add to Cart → Checkout → Pay → Track Order → Review
```

## Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Home page with hero, featured chefs, CTA | Connected |
| `/auth/login` | Email/password login | Connected |
| `/auth/signup` | Registration with name, email, password | Connected |
| `/auth/forgot-password` | Password reset form | **Placeholder** |
| `/chefs` | Browse chefs with filters | Connected (filters non-functional) |
| `/chefs/[slug]` | Storefront detail + menu | Connected |
| `/cart` | Cart review with quantity controls | Connected |
| `/checkout` | 2-step: details → Stripe payment | Connected |
| `/order-confirmation/[orderId]` | Real-time tracking + map | Connected |
| `/account` | Profile overview | Connected |
| `/account/orders` | Order history | Connected |
| `/account/addresses` | Address CRUD | Connected |
| `/account/favorites` | Favorites list | **Placeholder** |
| `/account/settings` | Profile + notification settings | **Partially connected** |

## Key Components

| Component | Role | Data Source |
|-----------|------|-------------|
| `Header` | Navigation, cart badge, auth state | `useAuthContext()`, `useCart()` |
| `ChefsList` | Chef grid (server) | `getActiveStorefronts()` |
| `ChefsFilters` | Filter sidebar | None (hardcoded) |
| `StorefrontHeader` | Chef info display | Props from server |
| `StorefrontMenu` | Menu items + add to cart | `useCart()` |
| `CartContext` | Cart state management | API sync |
| `NotificationBell` | Real-time notifications | Supabase Realtime |
| `OrderTrackingMap` | Leaflet delivery map | Driver presence polling |

## Data Flows

### Cart → Checkout → Payment
See [[Data Flow Master Map#4. Checkout & Payment Flow]]

### Key APIs
- `GET/POST/PATCH/DELETE /api/cart` — Cart CRUD
- `POST /api/checkout` — Order creation + Stripe PaymentIntent
- `GET/POST/PATCH/DELETE /api/addresses` — Address CRUD
- `GET /api/orders` — Order history
- `GET/PATCH /api/orders/[id]` — Order detail + cancel

## State

- **CartContext**: Only cross-page client state. Holds cart items, synced with DB.
- **Auth**: Via `AuthProvider` → `useAuthContext()`
- **Forms**: All local `useState`
- **Real-time**: Supabase channels for notifications and order status

## Gaps

1. Favorites page is a placeholder
2. Chef filters don't work
3. Settings form save is mocked
4. Forgot password page makes no API call
5. No image upload for profile
