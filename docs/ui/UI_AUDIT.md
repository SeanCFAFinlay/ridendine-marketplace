# Ridéndine UI Audit

## Scope

Audited `apps/web`, `apps/ops-admin`, `apps/chef-admin`, `apps/driver-app`, and existing `packages/ui`.

## Current Routes

Customer web includes `/`, `/about`, `/account`, `/cart`, `/checkout`, `/chef-resources`, `/chef-signup`, `/chefs`, `/contact`, `/how-it-works`, `/privacy`, and `/terms`.

Chef admin currently exposes `/` and `/dashboard` with auth layout support.

Driver app exposes `/`, `/earnings`, `/history`, `/profile`, and `/settings`.

Ops admin exposes `/`, `/dashboard`, plus dashboard subareas and API routes below `src/app/api`.

## Existing UI

`packages/ui` already existed with base button, input, card, badge, avatar, empty, error, modal, spinner, auth, and address components. All apps already include `../../packages/ui/src` in Tailwind content, so shared Tailwind classes are available cross-app.

## Gaps Found

- Apps had different visual personalities: customer pages were light and marketing-led, while admin surfaces were more utilitarian.
- Operational pages did not share a visible standard for live, fresh, stale, or unavailable data states.
- Blueprint/mockup routes did not exist.
- There was no shared token file documenting the platform visual language.
- Admin and driver surfaces had repeated status pill and metric-card patterns.

## Constraints Preserved

No database schema, backend API contract, or production route wiring was changed. Demo data is isolated under `/ui-blueprint`.
