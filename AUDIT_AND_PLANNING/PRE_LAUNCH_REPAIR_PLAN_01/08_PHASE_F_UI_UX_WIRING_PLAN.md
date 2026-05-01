# Phase F — UI/UX Wiring Plan

Focus findings: F-018, F-019, F-020, F-033 plus UI gaps noted in Audit 02.

## UI issue matrix

| Page/component | Current problem | Required API | Required state model | Error/loading behavior | Test needed |
|---|---|---|---|---|---|
| `apps/web/src/app/checkout/page.tsx` | residual client subtotal logic | `POST /api/checkout` quote response | server-authoritative totals state | explicit loading/disabled submit + stale cart errors | integration + component test |
| `apps/web` order tracking components | edge cases deferred | orders/notifications APIs | polling/realtime fallback model | offline/error fallback banner | e2e tracking flow |
| `apps/chef-admin` menu/order pages | ownership and state transition confidence gap | chef menu/orders routes | actor-scoped stores | clear mutation errors and retries | API + UI tests |
| `apps/chef-admin` availability | item-level availability partial | availability + menu item policy API | schedule model with override states | validation errors on invalid windows | integration tests |
| `apps/ops-admin` dashboard widgets | async warnings indicate brittle updates | ops APIs + audit/finance APIs | normalized fetch cache + refresh control | resilient empty/error states | component + e2e smoke |
| `apps/driver-app` lifecycle pages | realtime deferral and mobile signoff partial | deliveries/offers/location APIs | finite delivery state machine | location/network error handling | e2e + manual mobile QA |

## Required work

1. Execute `TODO/FIXME/placeholder` scan and triage to actionable backlog.
2. Verify every interactive form posts to real API and displays server errors.
3. Ensure protected page redirects are mirrored by API auth checks.
4. Add broken-link crawl in staging.
5. Capture mobile usability signoff checklist evidence (IRR-025 closure path).

## Acceptance criteria

1. No critical user flow relies on local-only fake success state.
2. Each app has loading, empty, and error states for top-level pages.
3. Broken links and placeholder artifacts are triaged or removed.
4. Mobile checklist signed for customer/chef/driver key routes.
