---
id: CMP-063
name: DashboardLayout
layer: UI
subsystem: OpsAdmin
path: apps/ops-admin/src/components/DashboardLayout.tsx
language: TypeScript
loc: 198
---

# [[CMP-063]] DashboardLayout

## Responsibility
Provides the shell layout for the ops admin dashboard including sidebar navigation, header, and content area.

## Public API
- `<DashboardLayout children>` — wraps page content with sidebar and header

## Depends on (outbound)
- [[CMP-043]] ButtonComponent — UI elements
- [[CMP-042]] AuthMiddleware — auth-protected navigation

## Depended on by (inbound)
- All ops admin pages

## Reads config
- None

## Side effects
- None

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/ops-admin/src/components/DashboardLayout.tsx` (lines 1–198)
