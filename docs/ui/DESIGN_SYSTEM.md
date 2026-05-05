# Ridéndine Design System

## Tokens

Shared tokens live in `packages/ui/src/tokens.ts`.

- Background: near-black charcoal.
- Surfaces: deep slate cards with clear borders.
- Primary: warm amber-gold.
- Status: success green, danger red, warning amber, info blue, muted slate.
- Radius: rounded 2xl cards, rounded controls, pill badges.
- Shadows: soft operational depth, with restrained amber glow only for primary surfaces.

## Components

Shared platform components live in `packages/ui/src/components/platform.tsx`.

Core exports include `AppShell`, `PageHeader`, `MetricCard`, `StatusBadge`, `HealthDot`, `LastUpdated`, `LoadingState`, `EmptyState`, `ErrorState`, `DataTable`, `ActionButton`, `OrderCard`, `OrderTimeline`, `LiveFeed`, `MapPlaceholder`, `MoneyCard`, `PayoutCard`, `UserAvatar`, `SidebarNav`, `TopNav`, `TabNav`, `FilterBar`, `SearchInput`, `DrawerPanel`, `Modal`, and `ToastMessage`.

## Usage

Production pages should keep existing API calls and pass real data into these components. Blueprint pages may use isolated demo data only.
