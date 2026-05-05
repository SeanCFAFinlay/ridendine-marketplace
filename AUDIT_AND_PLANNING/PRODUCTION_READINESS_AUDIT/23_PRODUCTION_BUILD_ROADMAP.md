# Production Build Roadmap
## PHASE 0 — Source of truth, branch hygiene, deploy locks

| Field | Plan |
| --- | --- |
| Objective | Make Source of truth, branch hygiene, deploy locks production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 1 — Auth/RBAC/account isolation

| Field | Plan |
| --- | --- |
| Objective | Make Auth/RBAC/account isolation production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 2 — Database constraints/RLS/data integrity

| Field | Plan |
| --- | --- |
| Objective | Make Database constraints/RLS/data integrity production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 3 — Customer marketplace + cart + checkout

| Field | Plan |
| --- | --- |
| Objective | Make Customer marketplace + cart + checkout production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 4 — Order lifecycle engine

| Field | Plan |
| --- | --- |
| Objective | Make Order lifecycle engine production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 5 — Chef operations

| Field | Plan |
| --- | --- |
| Objective | Make Chef operations production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 6 — Driver dispatch/delivery

| Field | Plan |
| --- | --- |
| Objective | Make Driver dispatch/delivery production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 7 — Ops live control center

| Field | Plan |
| --- | --- |
| Objective | Make Ops live control center production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 8 — Payment merchant ledger

| Field | Plan |
| --- | --- |
| Objective | Make Payment merchant ledger production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 9 — Payout/refund/reconciliation safety

| Field | Plan |
| --- | --- |
| Objective | Make Payout/refund/reconciliation safety production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 10 — Realtime/event bus/SLA alerts

| Field | Plan |
| --- | --- |
| Objective | Make Realtime/event bus/SLA alerts production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 11 — UI/UX/mobile polish

| Field | Plan |
| --- | --- |
| Objective | Make UI/UX/mobile polish production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 12 — Testing/QA/load/smoke/E2E

| Field | Plan |
| --- | --- |
| Objective | Make Testing/QA/load/smoke/E2E production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 13 — Observability/support/admin audit

| Field | Plan |
| --- | --- |
| Objective | Make Observability/support/admin audit production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |

## PHASE 14 — Production deployment hardening

| Field | Plan |
| --- | --- |
| Objective | Make Production deployment hardening production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | [apps/web/src/app/api/addresses/route.ts](../../apps/web/src/app/api/addresses/route.ts)<br>[apps/web/src/app/api/auth/login/route.ts](../../apps/web/src/app/api/auth/login/route.ts)<br>[apps/web/src/app/api/auth/signup/route.ts](../../apps/web/src/app/api/auth/signup/route.ts)<br>[apps/web/src/app/api/cart/route.ts](../../apps/web/src/app/api/cart/route.ts)<br>[apps/web/src/app/api/checkout/route.ts](../../apps/web/src/app/api/checkout/route.ts)<br>[apps/web/src/app/api/favorites/route.ts](../../apps/web/src/app/api/favorites/route.ts)<br>[apps/web/src/app/api/health/route.ts](../../apps/web/src/app/api/health/route.ts)<br>[apps/web/src/app/api/internal/command-center/change-requests/route.ts](../../apps/web/src/app/api/internal/command-center/change-requests/route.ts) |
| APIs to build/fix | `/api/addresses`, `/api/auth/login`, `/api/auth/signup`, `/api/cart`, `/api/checkout`, `/api/favorites` |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | `/about`, `/account/addresses`, `/account/favorites`, `/account/orders`, `/account`, `/account/settings` |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |
