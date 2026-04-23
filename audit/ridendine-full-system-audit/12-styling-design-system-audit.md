# 12 - Styling and Design System Audit

**Audit Date**: 2026-04-23
**Scope**: Tailwind configuration, shared UI components, per-app styles, design consistency
**Status**: FUNCTIONAL BUT INCONSISTENT - shared component library exists but layout/navigation is duplicated; significant design inconsistencies across apps

---

## Table of Contents

1. [Styling Stack](#styling-stack)
2. [Shared Tailwind Configuration](#shared-tailwind-configuration)
3. [Shared UI Component Library](#shared-ui-component-library)
4. [Per-App Style Files](#per-app-style-files)
5. [Brand Colors and Tokens](#brand-colors-and-tokens)
6. [Design Inconsistencies](#design-inconsistencies)
7. [Mobile and PWA Readiness](#mobile-and-pwa-readiness)
8. [Missing Shared Components](#missing-shared-components)

---

## Styling Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Tailwind CSS | v3 | Utility-first CSS framework |
| class-variance-authority (CVA) | — | Component variant management |
| clsx | — | Conditional class name composition |
| tailwind-merge | — | Tailwind class conflict resolution |
| PostCSS | — | CSS processing pipeline |

No CSS-in-JS library (styled-components, emotion) is used. All styling is Tailwind utility classes with occasional custom CSS properties in `globals.css`.

---

## Shared Tailwind Configuration

**File**: `packages/config/tailwind/tailwind.config.ts`

All 4 apps extend this shared configuration:

```typescript
// Each app's tailwind.config.ts
import baseConfig from '@ridendine/config/tailwind';
export default { ...baseConfig, content: [...] };
```

Shared configuration includes:
- Brand color palette (see Brand Colors section)
- Custom font stack
- Extended spacing scale
- Shared breakpoints (sm, md, lg, xl, 2xl — standard Tailwind)
- No custom animation definitions

---

## Shared UI Component Library

**Package**: `@ridendine/ui`
**Location**: `packages/ui/src/components/`

9 shared components:

| Component | File | CVA Variants | Used By |
|-----------|------|-------------|---------|
| `Button` | `button.tsx` | size (sm/md/lg), variant (primary/secondary/ghost/danger) | All 4 apps |
| `Input` | `input.tsx` | size (sm/md), error state | All 4 apps |
| `Card` | `card.tsx` | padding (sm/md/lg), shadow (none/sm/md) | All 4 apps |
| `Badge` | `badge.tsx` | color (green/red/yellow/blue/gray) | All 4 apps |
| `Spinner` | `spinner.tsx` | size (sm/md/lg), color | All 4 apps |
| `Avatar` | `avatar.tsx` | size (sm/md/lg), fallback initials | chef-admin, ops-admin |
| `Modal` | `modal.tsx` | size (sm/md/lg/full) | All 4 apps |
| `EmptyState` | `empty-state.tsx` | — | All 4 apps |
| `ErrorState` | `error-state.tsx` | — | All 4 apps |

All components are typed with TypeScript and use CVA for variant management. The component API is consistent.

### What Makes the Library Good

- CVA ensures variant combinations are type-safe
- `clsx` + `tailwind-merge` handle class conflicts correctly
- All components accept `className` prop for extension
- Components are accessible (ARIA attributes on Modal, Button)

### What the Library Is Missing

See [Missing Shared Components](#missing-shared-components).

---

## Per-App Style Files

Each app has its own `src/app/globals.css` with CSS custom properties:

| App | globals.css Custom Properties | Overlap with Other Apps |
|-----|------------------------------|------------------------|
| `apps/web` | Brand colors, font-face, scroll behavior | HIGH |
| `apps/chef-admin` | Same brand colors, sidebar width var | HIGH |
| `apps/ops-admin` | Same brand colors, table row height var | HIGH |
| `apps/driver-app` | Orange/teal primary vars (different names) | MEDIUM |

All 4 apps define the same brand color values in CSS custom properties with slightly different variable names. This is unnecessary duplication that could be consolidated in the shared Tailwind config as CSS layer variables.

---

## Brand Colors and Tokens

### Primary Brand Colors

| Color Name | Hex Value | Tailwind Token | Usage |
|-----------|-----------|---------------|-------|
| Brand orange | `#E85D26` | `brand-600` | Primary CTA buttons, active states |
| Brand teal | `#1a9e8e` | `teal-600` (custom) | Secondary actions, driver app primary |
| Brand dark teal | `#1a7a6e` | `teal-700` (custom) | Hover states, dark mode teal |

### Tailwind Brand Token

`brand-600` is defined in the shared config as `#E85D26`. The full brand scale (`brand-50` through `brand-900`) appears to be defined but only `brand-600` is consistently used. Lighter/darker shades are inconsistently used across apps.

### Color Usage Inconsistencies

| Pattern | web | chef-admin | ops-admin | driver-app |
|---------|-----|-----------|----------|-----------|
| Primary button color | `brand-600` | `brand-600` | `brand-600` | `orange-500` |
| Active nav item | `brand-600` bg | `brand-600` text | `indigo-600` | `teal-600` |
| Success badge | `green-100/green-800` | `green-100/green-800` | `emerald-100/emerald-700` | `green-500` |
| Error/danger color | `red-600` | `red-500` | `red-600` | `rose-500` |

Ops-admin uses `indigo` for its active navigation state, diverging from the brand orange used in other apps. Driver-app uses `orange-500` instead of `brand-600`, meaning any brand color change would not update the driver app.

---

## Design Inconsistencies

### 1. Layout/Navigation Components (Not Shared)

Each app has its own sidebar and layout component:

| App | Layout Component | File |
|-----|-----------------|------|
| `apps/web` | Top navigation bar | `src/components/layout/Navbar.tsx` |
| `apps/chef-admin` | Left sidebar + header | `src/components/layout/DashboardLayout.tsx` |
| `apps/ops-admin` | Left sidebar + header | `src/components/layout/OpsLayout.tsx` |
| `apps/driver-app` | Bottom tab navigation | `src/components/layout/DriverLayout.tsx` |

The sidebar in chef-admin and ops-admin are structurally identical (collapsible, icon + label, active state) but are separate components. A shared `DashboardSidebar` base component could serve both.

### 2. Form Patterns (Not Shared)

Form implementations vary across apps:

- All apps use `react-hook-form` for form state
- Validation wiring to Zod schemas is done differently in each app
- Field layout (label position, error message placement) is inconsistent
- No shared `FormField` wrapper component

### 3. Table/Data Grid (Not Shared)

Every app that displays tabular data (ops-admin, chef-admin) implements its own table markup. No shared `DataTable` component exists. Sorting, pagination, and row selection patterns differ between apps.

### 4. Toast/Notification UI (Not Shared)

| App | Toast Library | Style |
|-----|-------------|-------|
| `apps/web` | react-hot-toast | Default (bottom-right) |
| `apps/chef-admin` | react-hot-toast | Customized (top-right) |
| `apps/ops-admin` | react-hot-toast | Default (top-center) |
| `apps/driver-app` | react-hot-toast | Default (bottom-center) |

All apps use `react-hot-toast` but with different positioning and styling. A shared toast configuration should be exported from `@ridendine/ui`.

### 5. Loading States (Not Shared)

Loading skeletons and spinner placement vary per app. The shared `Spinner` component exists but loading page layouts are reimplemented per app.

---

## Mobile and PWA Readiness

| App | Responsive | PWA Manifest | Service Worker | Offline Support |
|-----|-----------|-------------|---------------|----------------|
| `apps/web` | YES | NO | NO | NO |
| `apps/chef-admin` | YES (basic) | NO | NO | NO |
| `apps/ops-admin` | NO (desktop-only) | NO | NO | NO |
| `apps/driver-app` | YES | YES | YES (partial) | NO |

Driver-app is the only PWA-ready app with a Web App Manifest and service worker. The service worker is registered but does not implement caching strategies — it only enables "Add to Home Screen" behavior.

Ops-admin does not have responsive styles. The sidebar and table layouts break on mobile/tablet viewports. This is intentional for an ops tool but should be documented.

---

## Missing Shared Components

The following components are repeatedly reimplemented across apps and should be added to `@ridendine/ui`:

| Missing Component | Current State | Priority |
|-----------------|--------------|---------|
| `DataTable` | Each app has own implementation | HIGH |
| `FormField` | Inconsistent per-app wrappers | HIGH |
| `Sidebar` / `DashboardLayout` | Duplicated in chef-admin + ops-admin | MEDIUM |
| `Toast` configuration | Inconsistent positioning per app | MEDIUM |
| `PageHeader` | Duplicated heading + breadcrumb pattern | LOW |
| `StatCard` | Duplicated metric display pattern | LOW |
| `ConfirmDialog` | Reimplemented per app | LOW |
| `DateRangePicker` | Only in ops-admin, not shared | LOW |
| `FileUpload` | Not implemented anywhere | HIGH (blocker) |
| `SkeletonLoader` | Inconsistent per page | LOW |
