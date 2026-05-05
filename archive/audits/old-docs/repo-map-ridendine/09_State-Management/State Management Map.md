# State Management Map

> Local state, context providers, query caching, real-time subscriptions, and server/client boundaries.

## State Architecture Overview

Ride N Dine uses **no global state management library** (no Redux, Zustand, Jotai). State is managed through:

1. **React Context** — CartContext (web only), AuthProvider (all apps)
2. **Server Components** — Data fetched on server, passed as props
3. **Local Component State** — useState for forms, filters, modals
4. **Supabase Realtime** — Channel subscriptions for live updates
5. **URL State** — Search params for filters/pagination (ops-admin)

## Context Providers

### AuthProvider (`@ridendine/auth`)

| Property | Type | Source |
|----------|------|--------|
| `user` | User \| null | `supabase.auth.getUser()` |
| `session` | Session \| null | `supabase.auth.getSession()` |
| `loading` | boolean | Initial load state |
| `signOut()` | function | `supabase.auth.signOut()` |

**Scope**: Wraps entire app in all 4 applications (root layout.tsx)
**Mutations**: Only signOut modifies state directly
**Consumers**: Header components, protected pages, actor context functions

### CartContext (`apps/web` only)

| Property | Type | Source |
|----------|------|--------|
| `cart` | `{id, storefront_id, storefront_name?, items[], subtotal}` | API: GET `/api/cart` |
| `loading` | boolean | Fetch state |
| `storefrontId` | string \| null | Set by consumer |
| `itemCount` | number | Computed from items.length |
| `fetchCart(sfId)` | function | GET `/api/cart?storefrontId=` |
| `addToCart(sfId, itemId, qty, instructions?)` | function | POST `/api/cart` → refetch |
| `updateQuantity(itemId, qty)` | function | PATCH `/api/cart?itemId=` → refetch |
| `removeItem(itemId)` | function | DELETE `/api/cart?itemId=` → refetch |
| `clearCart()` | function | Local state reset |
| `setStorefrontId(id)` | function | Triggers fetch if cart empty |

**Scope**: Wraps entire web app (root layout, inside AuthProvider)
**Data flow**: Local state ↔ API calls ↔ Database
**Auto-fetch**: useEffect watches storefrontId, fetches if cart empty

## Server vs Client Component Boundaries

### Web App

| Layer | Type | Data Strategy |
|-------|------|---------------|
| Root layout | Server | Wraps providers |
| Home page | Server | `getActiveStorefronts()` |
| Chefs page | Server | `getActiveStorefronts()` |
| Chef detail | Server | `getStorefrontBySlug()`, `getMenuItemsByStorefront()` |
| Cart page | **Client** | `useCart()` context |
| Checkout page | **Client** | API calls, Stripe Elements |
| Order confirmation | **Client** | Supabase direct + realtime |
| Account pages | **Client** | `useAuthContext()`, API calls |
| Auth pages | **Client** | Form state, API calls |

### Chef Admin

| Layer | Type | Data Strategy |
|-------|------|---------------|
| Dashboard home | Server | `getChefStorefront()`, `getDashboardData()` → props |
| Menu page | Server → Client | Server fetches data → `MenuList` client component |
| Orders page | Server → Client | Server fetches → `OrdersList` with realtime subscription |
| Storefront page | Server → Client | Server checks state → `StorefrontForm` client component |
| Payouts page | **Client** | `createBrowserClient()` direct queries |
| Analytics page | **Client** | `createBrowserClient()` direct queries |
| Reviews page | **Client** | `createBrowserClient()` direct queries |

### Ops Admin

| Layer | Type | Data Strategy |
|-------|------|---------------|
| Dashboard | Server | `engine.ops.getDashboard()` |
| Chef/Customer/Driver lists | **Client** | `fetch()` to API routes |
| Detail pages | Server | Direct DB/engine queries → props |
| Action components | **Client** | `fetch()` to API routes |
| Finance/Settings | Server → Client | Server data → client forms |

### Driver App

| Layer | Type | Data Strategy |
|-------|------|---------------|
| Home (dashboard) | Server → Client | Server fetches → `DriverDashboard` client |
| Delivery detail | Server → Client | Server fetches → `DeliveryDetail` with location hook |
| Earnings/History | Server → Client | Server fetches → client display |
| Profile | Server → Client | Server fetches → client edit form |

## Real-Time Subscriptions

| App | Component | Channel | Event | Action |
|-----|-----------|---------|-------|--------|
| web | NotificationBell | `notifications` table | INSERT | Add to notification list, show browser notification |
| web | Order confirmation | `orders` table | UPDATE (id match) | Update order status display |
| web | Order confirmation | Polling (15s) | — | Fetch driver_presence for location |
| chef-admin | OrdersList | `orders` table | INSERT, UPDATE | Refresh orders list, play audio alert on new orders |
| driver-app | — | None | — | No realtime subscriptions (uses polling/refresh) |
| ops-admin | — | None | — | No realtime subscriptions |

## Form State Patterns

| App | Component | State Management | Submit Target |
|-----|-----------|-----------------|---------------|
| web | Login form | `useState` (email, password) | POST `/api/auth/login` |
| web | Signup form | `useState` (5 fields) | `useAuth().signUp()` |
| web | Checkout | `useState` (address, tip, promo) | POST `/api/checkout` |
| web | Contact form | `useState` (5 fields) | POST `/api/support` |
| web | Address form | `useState` (7 fields) | POST/PATCH `/api/addresses` |
| web | Settings form | `useState` (profile + notifications) | `setTimeout` mock (**not wired**) |
| chef | Menu modals | `useState` (item/category fields) | POST/PATCH `/api/menu` |
| chef | Storefront form | `useState` (storefront fields) | PATCH `/api/storefront` |
| chef | Profile form | `useState` (3 fields) | PATCH `/api/profile` |
| ops | Settings form | `useState` (11 fields) | POST `/api/engine/settings` |
| ops | Delivery actions | `useState` (mode, selected driver) | POST `/api/engine/dispatch` |
| driver | Profile form | `useState` (3 fields) | PATCH `/api/driver` |

## URL-Based State (Ops Admin)

| Page | Params | Purpose |
|------|--------|---------|
| `/dashboard/deliveries` | `queue`, `search`, `page` | Filter dispatch queue, paginate (10/page) |
| `/dashboard/support` | `status`, `search`, `page` | Filter tickets, paginate (10/page) |
| `/dashboard/chefs` | `status` | Filter by chef approval status |

## Key State Observations

1. **No query caching** — No React Query, SWR, or similar. Each navigation refetches data.
2. **No optimistic updates** — All mutations wait for server response before updating UI.
3. **Cart is the only cross-page client state** — Everything else is page-local or server-fetched.
4. **Browser client used for realtime only** — Most data fetching goes through API routes or server components.
5. **No offline support** — Driver app has PWA metadata but no service worker or offline cache.
6. **Form state reset on navigation** — No persistence of form drafts.
