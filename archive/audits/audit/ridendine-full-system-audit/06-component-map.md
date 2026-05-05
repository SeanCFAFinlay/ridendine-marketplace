# 06 - Component Map

**Audit Date**: 2026-04-23
**Scope**: All React components across all apps and the shared @ridendine/ui package. Includes status notes and duplication observations.

---

## @ridendine/ui - Shared Component Library

Location: `packages/ui/src/components/`
All components exported from `packages/ui/src/index.ts` as `@ridendine/ui`.

| Component | File | Props/Variants | Status | Notes |
|-----------|------|----------------|--------|-------|
| `Button` | `button.tsx` | `variant`: primary, secondary, ghost, destructive; `size`: sm, md, lg; `disabled`, `loading` | working | Used across all 4 apps |
| `Input` | `input.tsx` | `label`, `error`, `placeholder`, `type`, `disabled` | working | Form input with label and error message display |
| `Card` | `card.tsx` | `CardHeader`, `CardContent`, `CardFooter` sub-components | working | Flexible container used throughout dashboards |
| `Badge` | `badge.tsx` | `variant`: default, success, warning, error, info | working | Status labels for order/delivery states |
| `Spinner` | `spinner.tsx` | `size`: sm, md, lg; `className` | working | Loading indicator |
| `Avatar` | `avatar.tsx` | `src`, `alt`, `fallback` (initials), `size` | working | User/chef image with graceful initials fallback |
| `Modal` | `modal.tsx` | `open`, `onClose`, `title`, `children` | working | Accessible dialog overlay (focus trap, ESC close) |
| `EmptyState` | `empty-state.tsx` | `title`, `description`, `action` (optional CTA) | working | Zero-data placeholder with optional action button |
| `ErrorState` | `error-state.tsx` | `title`, `description`, `retry` (optional callback) | working | Error display with optional retry action |

**Shared utility**: `cn()` from `packages/ui/src/utils.ts` (re-export of `clsx` + `tailwind-merge`). All apps import `cn` directly from `@ridendine/ui`.

---

## apps/web - Local Components

Location: `apps/web/src/components/`

### Layout
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `Header` | `layout/header.tsx` | Site-wide navigation header with logo, nav links, cart icon, user menu | working | Conditionally shows cart icon and user menu based on auth state |

### Auth
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `AuthLayout` | `auth/auth-layout.tsx` | Wrapper for auth pages (login/signup/forgot-password) with branded left panel | working | Duplicated in chef-admin (see duplication notes) |
| `PasswordStrength` | `auth/password-strength.tsx` | Real-time password strength indicator (weak/fair/strong/very strong) | working | Has test coverage. Duplicated in chef-admin. |

### Chefs / Browse
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `ChefsList` | `chefs/chefs-list.tsx` | Grid of chef storefront cards with name, cuisine, rating, delivery info | working | Renders real data; no pagination |
| `ChefsFilters` | `chefs/chefs-filters.tsx` | Filter controls for cuisine type, rating, delivery time | partial | Filters may be client-side only; no URL param sync |

### Home
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `FeaturedChefs` | `home/featured-chefs.tsx` | Homepage featured chef storefront cards | working | Fetches top-rated storefronts |

### Storefront
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `StorefrontHeader` | `storefront/storefront-header.tsx` | Chef storefront hero (banner, avatar, name, rating, hours) | working | Renders storefront data |
| `StorefrontMenu` | `storefront/storefront-menu.tsx` | Menu items grid with category tabs and add-to-cart | working | Integrates with cart-context |

### Checkout
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `StripePaymentForm` | `checkout/stripe-payment-form.tsx` | Stripe Elements card form with submit and error handling | working | Uses `@stripe/react-stripe-js` Elements |

### Notifications
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `NotificationBell` | `notifications/notification-bell.tsx` | Header notification bell with unread badge and dropdown | partial | Fetches notifications; no real-time subscription |

### Tracking
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `OrderTrackingMap` | `tracking/order-tracking-map.tsx` | Order status display with progress steps and map | partial | Status steps work; real-time map tracking not implemented |

### Contexts
| Context | File | Purpose | Status |
|---------|------|---------|--------|
| `CartContext` | `contexts/cart-context.tsx` | Cart state management (items, add, remove, update quantity, clear, total) | working |

---

## apps/chef-admin - Local Components

Location: `apps/chef-admin/src/components/`

### Layout
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `Header` | `layout/header.tsx` | Dashboard top header (user info, logout) | working | Separate from web app header |
| `Sidebar` | `layout/sidebar.tsx` | Dashboard sidebar navigation (orders, menu, storefront, payouts, etc.) | working | Active state highlighting |

### Auth (Duplicated)
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `AuthLayout` | `auth/auth-layout.tsx` | Auth page wrapper (same as web/auth/auth-layout.tsx) | working | **Duplication**: Identical purpose to web version |
| `PasswordStrength` | `auth/password-strength.tsx` | Password strength indicator | working | **Duplication**: Identical to web version |

### Orders
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `OrdersList` | `orders/orders-list.tsx` | List of orders with status badges and action buttons (accept, reject, start prep, mark ready) | partial | Actions call API; no real-time update when new orders arrive |

### Menu
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `MenuList` | `menu/menu-list.tsx` | Menu items table with add/edit/delete and category assignment | working | Full CRUD |

### Storefront
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `StorefrontForm` | `storefront/storefront-form.tsx` | Edit existing storefront details | working | Name, description, cuisine, hours, photo URL |
| `StorefrontSetupForm` | `storefront/storefront-setup-form.tsx` | Initial storefront creation wizard (shown on first login after signup) | working | Used during onboarding |

### Profile
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `ProfileForm` | `profile/profile-form.tsx` | Chef profile edit form | working | Updates chef name, bio, contact info |

---

## apps/ops-admin - Local Components

Location: `apps/ops-admin/src/components/`

### Layout
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `DashboardLayout` | `DashboardLayout.tsx` | Main dashboard shell (sidebar navigation + header + content area) | working | Single root layout for all dashboard pages |

### Dashboard Widgets
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `AlertsPanel` | `dashboard/alerts-panel.tsx` | Active alerts and escalations list panel | partial | Renders alerts; may not update without refresh |
| `OrdersHeatmap` | `dashboard/orders-heatmap.tsx` | Order volume by hour/day heatmap chart | partial | Chart renders; data completeness varies |
| `RealTimeStats` | `dashboard/real-time-stats.tsx` | Live counters (active orders, drivers online, etc.) | partial | Fetches stats; not real-time without subscription |
| `RevenueChart` | `dashboard/revenue-chart.tsx` | Revenue trend chart (likely recharts) | partial | Chart renders; may use aggregated/placeholder data |

### Map
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `DeliveryMap` | `map/delivery-map.tsx` | Static delivery pins map | placeholder | Component exists; real driver location data wiring incomplete |
| `LiveMap` | `map/live-map.tsx` | Live driver location map | placeholder | Component exists; no real-time location subscription |

### Page-Level Action Components (co-located with pages)
| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| `ChefGovernanceActions` | `dashboard/chefs/[id]/chef-governance-actions.tsx` | Approve, suspend, reactivate chef buttons | working |
| `StorefrontGovernanceActions` | `dashboard/chefs/[id]/storefront-governance-actions.tsx` | Activate, deactivate, feature storefront | working |
| `DriverGovernanceActions` | `dashboard/drivers/[id]/driver-governance-actions.tsx` | Approve, suspend, reassign driver | working |
| `DeliveryActions` | `dashboard/deliveries/[id]/delivery-actions.tsx` | Manual dispatch, status override | working |
| `StatusActions` | `dashboard/orders/[id]/status-actions.tsx` | Manual order status override buttons | working |
| `FinanceActions` | `dashboard/finance/finance-actions.tsx` | Process refund, approve refund request | working |
| `SettingsForm` | `dashboard/settings/settings-form.tsx` | Platform settings edit form | working |

---

## apps/driver-app - Local Components

Location: `apps/driver-app/src/` (mix of `components/` and page-level `app/**/components/`)

### Shared
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `RouteMap` | `components/map/route-map.tsx` | Navigation route display (pickup and dropoff markers) | partial | Map renders; turn-by-turn not implemented |

### Page-Level Components (co-located)
| Component | File | Purpose | Status | Notes |
|-----------|------|---------|--------|-------|
| `DriverDashboard` | `app/components/DriverDashboard.tsx` | Main dashboard UI (online toggle, offer cards, active delivery card) | working | Core driver workflow |
| `DeliveryDetail` | `app/delivery/[id]/components/DeliveryDetail.tsx` | Delivery detail with pickup/deliver confirm buttons | working | Status transitions functional |
| `EarningsView` | `app/earnings/components/EarningsView.tsx` | Earnings breakdown by period | partial | Real data; summary completeness varies |
| `HistoryView` | `app/history/components/HistoryView.tsx` | Past deliveries list | placeholder | Component exists; data may be limited |
| `ProfileView` | `app/profile/components/ProfileView.tsx` | Driver profile display/edit | partial | View works; edit form completeness unclear |

### Hooks
| Hook | File | Purpose | Status |
|------|------|---------|--------|
| `useLocationTracker` | `hooks/use-location-tracker.ts` | GPS location tracking with in-memory rate limiting (5s minimum) and background POST to /api/location | working |

---

## Duplication Analysis

The following components are duplicated across apps with no or minimal differences:

| Component | Duplicated In | Duplication Type | Recommendation |
|-----------|---------------|-----------------|----------------|
| `AuthLayout` | `apps/web`, `apps/chef-admin` | Near-identical implementation | Move to `@ridendine/ui` |
| `PasswordStrength` | `apps/web`, `apps/chef-admin` | Exact duplication | Move to `@ridendine/ui` |
| `Header` (dashboard) | `apps/chef-admin`, `apps/ops-admin` | Similar purpose, different nav items | Could share a base `DashboardHeader` in `@ridendine/ui` |
| `Sidebar` (nav) | `apps/chef-admin`, `apps/ops-admin` | Similar structure, different links | Could share a base `DashboardSidebar` in `@ridendine/ui` |
| Dashboard layout shell | `apps/chef-admin` (via dashboard/layout.tsx), `apps/ops-admin` (via DashboardLayout.tsx), `apps/driver-app` (root layout) | Each app rolls its own shell | Low priority; app-specific differences justify separation |

**Priority duplications to resolve**: `AuthLayout` and `PasswordStrength` are identical across web and chef-admin. They should be moved to `@ridendine/ui` to prevent divergence (e.g., a password policy change would need to be made in 2 places).

---

## Component Pattern Observations

### Positive Patterns
1. **Composition over inheritance**: All `@ridendine/ui` components are composable (Card has CardHeader/CardContent/CardFooter sub-components)
2. **Error states everywhere**: `ErrorState` and `EmptyState` components are used consistently to handle loading failures gracefully
3. **Governance action isolation**: Ops-admin puts governance action buttons in their own co-located component files, keeping page files clean
4. **Page-level co-location for driver-app**: The driver app co-locates components with their pages (inside `app/**/components/`), reducing unnecessary abstraction for a small app

### Gaps
1. **No form component**: Each app builds its own forms using raw `Input` components. A `Form` or `FormField` wrapper with integrated Zod validation would reduce boilerplate
2. **No data table component**: List pages (chefs, customers, drivers, orders) each implement their own table/list UI without a shared `DataTable` component
3. **No toast/notification component**: User feedback after actions (e.g., "Order accepted") appears to use browser defaults or is missing. No shared toast is in `@ridendine/ui`
4. **No loading skeleton component**: Loading states use `Spinner` but no skeleton loaders for content-first loading perception
