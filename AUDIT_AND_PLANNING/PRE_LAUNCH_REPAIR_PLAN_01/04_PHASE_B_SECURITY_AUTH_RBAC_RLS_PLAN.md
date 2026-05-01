# Phase B — Security/Auth/RBAC/Service-Role/RLS Plan

Focus findings: F-005, F-006, F-013, F-014, F-015, F-017, F-030.

## Workstreams

1. **Web service-role ownership enforcement (IRR-003 completion)**
2. **Role and ownership checks across chef/driver/customer/ops APIs**
3. **Support and sensitive-table RLS tightening (IRR-033 depth)**
4. **Privileged-action audit logging consistency**
5. **Security regression test suite**

## Route-by-route security repair matrix

| Route group | Current risk | Required auth | Required role | Ownership rule | Validation schema | Service role allowed | Test required |
|---|---|---|---|---|---|---|---|
| `apps/web/api/cart` | cross-customer read/write | customer session | customer | `customer_id === actor.customerId` | cart zod | yes (server only) | negative cross-customer |
| `apps/web/api/orders*` | order IDOR | customer session | customer | order belongs to actor customer | order id zod | yes | read/mutate isolation |
| `apps/web/api/addresses` | address IDOR | customer session | customer | address belongs to actor | address zod | yes | CRUD isolation |
| `apps/web/api/favorites` | partial hardening only | customer session | customer | favorite row scoped by actor | UUID + payload zod | yes | cross-customer insert/read |
| `apps/web/api/reviews` | partial hardening only | customer session | customer | review owner/order linkage | review zod | yes | forged owner reject |
| `apps/web/api/support*` | sensitive ticket leakage | customer session | customer | ticket owner + scoped support ops | support zod | yes | list/detail isolation |
| `apps/chef-admin/api/orders*` | suspected cross-chef access | chef session | approved chef | `chef_id == actor.chefId` | order action zod | yes | chef A cannot see B |
| `apps/driver-app/api/deliveries*` | assignment leakage | driver session | approved driver | assignment to actor driver | delivery id zod | yes | driver A/B isolation |
| `apps/ops-admin/api/*` | role bypass | platform session | capability-based | N/A (ops scope) | route-specific zod | yes | 401/403 matrix |
| `ops-admin/api/engine/processors/*` | token misuse | processor token | system | N/A | header schema | yes | missing/invalid token |

## Sensitive DB policy plan

- Tables: `support_tickets`, `payments/ledger` related access paths, any PII-heavy support/customer views.
- Actions:
  1. Add migration with explicit policy naming/versioning.
  2. Encode least-privilege roles and assignment checks.
  3. Keep emergency ops override policy separate and audited.

## Middleware limitations handling

- Middleware remains UX gating only; every route must enforce authz independently.
- Add explicit checklist in PR template: “API secured without middleware assumptions.”

## Security tests to add

- Route-level ownership tests for all web customer APIs using admin client.
- Chef/driver cross-tenant negative tests.
- Ops capability matrix tests for critical write routes.
- RLS tests (SQL-level + API-level) for support tickets.
- Upload security tests (MIME, size, extension spoof, scan integration hook).

## Acceptance criteria

1. IRR-003 moved to **Verified** with route matrix + tests.
2. IRR-033 risk reduced with merged migration + passing policy tests.
3. No `NEXT_PUBLIC_*` secrets; no client import of admin client.
4. All privileged writes emit audit events/log entries.
