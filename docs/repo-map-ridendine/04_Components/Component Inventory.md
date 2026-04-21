# Component Inventory

> Every meaningful UI component across all 4 apps, classified and connected.

## Shared UI Components (`@ridendine/ui`)

| Component | File | Type | Variants | Used By |
|-----------|------|------|----------|---------|
| `Button` | `packages/ui/src/components/button.tsx` | Action control | default, secondary, outline, ghost, destructive, success × sm/md/lg/icon | All 4 apps |
| `Card` | `packages/ui/src/components/card.tsx` | Layout wrapper | padding: none/sm/md/lg. Sub: CardHeader, CardTitle, CardDescription, CardContent, CardFooter | All 4 apps |
| `Input` | `packages/ui/src/components/input.tsx` | Form component | Standard with focus styles | All 4 apps |
| `Badge` | `packages/ui/src/components/badge.tsx` | Status indicator | default, secondary, outline, success, warning, destructive × sm/md | All 4 apps |
| `Spinner` | `packages/ui/src/components/spinner.tsx` | Loading indicator | sm/md/lg | All 4 apps |
| `Avatar` | `packages/ui/src/components/avatar.tsx` | Display | AvatarImage + AvatarFallback | web, chef-admin |
| `Modal` | `packages/ui/src/components/modal.tsx` | Overlay | ModalHeader, ModalTitle, ModalClose, ModalContent, ModalFooter (Headless UI Dialog) | ops-admin, chef-admin |
| `EmptyState` | `packages/ui/src/components/empty-state.tsx` | Display | icon, title, description, action | web |
| `ErrorState` | `packages/ui/src/components/error-state.tsx` | Display | title, description, action | web |
| `cn()` | `packages/ui/src/utils.ts` | Utility | clsx + tailwind-merge | All 4 apps |

## Customer App Components (`apps/web`)

### Layout

| Component | File | Type | Props | Hooks | Renders | Status |
|-----------|------|------|-------|-------|---------|--------|
| `Header` | `components/layout/header.tsx` | Layout | — | `useAuthContext()`, `useCart()` | Logo, nav, cart badge, avatar, mobile menu | **Active** |

### Auth

| Component | File | Type | Props | Status |
|-----------|------|------|-------|--------|
| `AuthLayout` | `components/auth/auth-layout.tsx` | Layout wrapper | children, title, subtitle | **Active** |
| `PasswordStrength` | `components/auth/password-strength.tsx` | Display | password: string | **Active** |

### Chefs / Storefront

| Component | File | Type | Props | Data Source | Status |
|-----------|------|------|-------|-------------|--------|
| `ChefsList` | `components/chefs/chefs-list.tsx` | Server | — | `getActiveStorefronts(limit:20)` | **Active** |
| `ChefsFilters` | `components/chefs/chefs-filters.tsx` | Client | — | None (hardcoded options) | **Placeholder** — filters don't filter |
| `FeaturedChefs` | `components/home/featured-chefs.tsx` | Server | — | `getActiveStorefronts(limit:6, featured:true)` | **Active** |
| `StorefrontHeader` | `components/storefront/storefront-header.tsx` | Display | storefront data | Props only | **Active** |
| `StorefrontMenu` | `components/storefront/storefront-menu.tsx` | Client | items, categories | `useCart()` | **Active** |

### Notifications

| Component | File | Type | Hooks | Status |
|-----------|------|------|-------|--------|
| `NotificationBell` | `components/notifications/notification-bell.tsx` | Client | `createBrowserClient()`, Supabase realtime | **Active** — real-time notifications |

### Tracking

| Component | File | Type | Props | Status |
|-----------|------|------|-------|--------|
| `OrderTrackingMap` | `components/tracking/order-tracking-map.tsx` | Client (SSR disabled) | driverLocation | **Active** — Leaflet + OpenStreetMap, Hamilton default center |

---

## Chef Admin Components (`apps/chef-admin`)

### Layout

| Component | File | Hooks | Status |
|-----------|------|-------|--------|
| `Header` | `components/layout/header.tsx` | `useAuthContext()` | **Active** |
| `Sidebar` | `components/layout/sidebar.tsx` | `usePathname()` | **Active** — 8 nav items |

### Auth

| Component | File | Status |
|-----------|------|--------|
| `AuthLayout` | `components/auth/auth-layout.tsx` | **Active** — "Chef Portal" badge variant |
| `PasswordStrength` | `components/auth/password-strength.tsx` | **Active** — duplicated from web |

### Menu

| Component | File | Type | Features | Status |
|-----------|------|------|----------|--------|
| `MenuList` | `components/menu/menu-list.tsx` | Client | CRUD modals, toggle availability, delete items, category management | **Active** — full CRUD |

### Orders

| Component | File | Type | Features | Status |
|-----------|------|------|----------|--------|
| `OrdersList` | `components/orders/orders-list.tsx` | Client | Real-time Supabase subscription, 8-min countdown timer, status actions, audio alert | **Active** — fully wired |

### Profile

| Component | File | Type | Status |
|-----------|------|------|--------|
| `ProfileForm` | `components/profile/profile-form.tsx` | Client | **Active** — display_name, bio, phone. Image upload is stub. |

### Storefront

| Component | File | Type | Status |
|-----------|------|------|--------|
| `StorefrontForm` | `components/storefront/storefront-form.tsx` | Client | **Active** — edit existing storefront. Image upload is stub. |
| `StorefrontSetupForm` | `components/storefront/storefront-setup-form.tsx` | Client | **Active** — create new storefront |

---

## Ops Admin Components (`apps/ops-admin`)

### Layout

| Component | File | Type | Features |
|-----------|------|------|----------|
| `DashboardLayout` | `components/DashboardLayout.tsx` | Client | 12-item sidebar grouped by section (Main, Operations, Business, System), top bar with status |

### Governance Actions (Inline Components)

| Component | File | Props | Actions | Status |
|-----------|------|-------|---------|--------|
| `ChefGovernanceActions` | `dashboard/chefs/[id]/chef-governance-actions.tsx` | chefId, chefStatus | approve, reject, suspend, unsuspend | **Active** |
| `StorefrontGovernanceActions` | `dashboard/chefs/[id]/storefront-governance-actions.tsx` | storefrontId, isActive | publish, unpublish | **Active** |
| `DriverGovernanceActions` | `dashboard/drivers/[id]/driver-governance-actions.tsx` | driverId, currentStatus | approve, reject, suspend, restore | **Active** |
| `OrderStatusActions` | `dashboard/orders/[id]/status-actions.tsx` | orderId, currentStatus, allowedActions | accept, reject, prepare, ready, complete | **Active** |
| `DeliveryActions` | `dashboard/deliveries/[id]/delivery-actions.tsx` | deliveryId, currentStatus, drivers[] | manual_assign, reassign, escalate, cancel, note | **Active** — modal-based |
| `FinanceActions` | `dashboard/finance/finance-actions.tsx` | refunds[], adjustments[] | approve/deny refund, release payout hold | **Active** |
| `SettingsForm` | `dashboard/settings/settings-form.tsx` | initialRules, canEdit | 9 numeric + 2 boolean platform settings | **Active** |

---

## Driver App Components (`apps/driver-app`)

### Core

| Component | File | Type | Props | Hooks | Status |
|-----------|------|------|-------|-------|--------|
| `DriverDashboard` | `app/components/DriverDashboard.tsx` | Client | driver, activeDeliveries | — | **Active** — online toggle, active delivery card, bottom nav |
| `DeliveryDetail` | `app/delivery/[id]/components/DeliveryDetail.tsx` | Client | delivery, order | `useLocationTracker()` | **Active** — 6-step progress, navigation, completion modal |
| `EarningsView` | `app/earnings/components/EarningsView.tsx` | Client | deliveries | — | **Active** — weekly bar chart, today's list |
| `HistoryView` | `app/history/components/HistoryView.tsx` | Client | deliveries | — | **Active** — grouped by date |
| `ProfileView` | `app/profile/components/ProfileView.tsx` | Client | driver | — | **Active** — edit mode, logout |

### Map

| Component | File | Type | Props | Status |
|-----------|------|------|-------|--------|
| `RouteMap` | `components/map/route-map.tsx` | Client | pickup/dropoff/driver lat/lng | **Active** — Leaflet + colored markers + dashed route line |

---

## Component Duplication Audit

| Component | web | chef-admin | Notes |
|-----------|-----|-----------|-------|
| `AuthLayout` | Yes | Yes (variant) | Different branding ("Chef Portal" badge) but same structure |
| `PasswordStrength` | Yes | Yes | **Exact duplicate** — should be in `@ridendine/ui` |
| `Header` | Yes | Yes | Different implementations — web has cart, chef has notifications |
| Loading spinners | Each app | Each app | All use same Spinner from `@ridendine/ui` |
| Error boundaries | Each app | Each app | Similar pattern, app-specific messaging |

## Component Ownership Matrix

| Domain | Components | App |
|--------|-----------|-----|
| Customer browsing | ChefsList, ChefsFilters, FeaturedChefs, StorefrontHeader, StorefrontMenu | web |
| Customer cart | CartContext (not a component, but state) | web |
| Customer tracking | OrderTrackingMap, NotificationBell | web |
| Chef menu management | MenuList | chef-admin |
| Chef order management | OrdersList | chef-admin |
| Chef storefront | StorefrontForm, StorefrontSetupForm | chef-admin |
| Chef profile | ProfileForm | chef-admin |
| Ops governance | ChefGovernanceActions, DriverGovernanceActions, StorefrontGovernanceActions | ops-admin |
| Ops orders | OrderStatusActions | ops-admin |
| Ops delivery | DeliveryActions | ops-admin |
| Ops finance | FinanceActions | ops-admin |
| Ops settings | SettingsForm | ops-admin |
| Driver delivery | DriverDashboard, DeliveryDetail | driver-app |
| Driver earnings | EarningsView, HistoryView | driver-app |
| Driver profile | ProfileView | driver-app |
| Driver map | RouteMap | driver-app |
| Shared | Button, Card, Input, Badge, Spinner, Avatar, Modal, EmptyState, ErrorState | @ridendine/ui |
