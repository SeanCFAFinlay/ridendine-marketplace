# Testing and Acceptance Matrix

| Repair item | Unit | Integration | E2E | Manual QA | Security test | Load test | Command | Pass condition | Evidence location |
|---|---|---|---|---|---|---|---|---|---|
| IRR-003 web ownership audit | Y | Y | optional | Y | Y | N | `pnpm --filter @ridendine/web test` | cross-customer denied | test logs + route matrix |
| RiskEngine checkout hook | Y | Y | Y | Y | Y | N | web + engine tests | high-risk blocked pre-payment | CI artifacts |
| Stripe env guardrails | Y | Y | Y | Y | Y | N | env validation tests | staging/dev reject live keys | test output |
| Webhook idempotency/signature | Y | Y | optional | N | Y | N | webhook route + engine tests | invalid signature 400; replay idempotent | jest/vitest report |
| Support RLS tightening | Y | Y | optional | Y | Y | N | SQL tests + API tests | role/assignment isolation | migration + policy test logs |
| Distributed rate limiting | Y | Y | Y | Y | Y | Y | RL tests + k6 | limits consistent multi-instance | RL dashboards + report |
| Chef/driver test coverage | Y | Y | Y | Y | N | N | new package test scripts | CI includes chef+driver | CI workflow run |
| Playwright critical flows | N | N | Y | Y | N | N | `pnpm ... test:e2e` | 4 role flows pass | playwright artifacts |
| Health depth readiness | Y | Y | optional | Y | N | N | health integration tests | db/env/dependency checks valid | test output |
| Finance reconciliation | Y | Y | optional | Y | Y | N | ops-admin tests | export matches ledger query | golden files |
| Upload AV/private bucket | Y | Y | optional | Y | Y | N | upload tests | malicious upload blocked | security test logs |

## Command plan (full)

1. `pnpm verify:prod-data-hygiene`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test`
5. `pnpm build`
6. `pnpm --filter @ridendine/web test:e2e` (new)
7. `pnpm --filter @ridendine/chef-admin test` (new)
8. `pnpm --filter @ridendine/driver-app test` (new)
9. Stripe webhook replay tests (test mode only)
10. RLS/security integration suite
11. Load scripts (k6/Artillery) in staging
12. Local + staging smoke command (`pnpm smoke` proposed)

## Acceptance thresholds

- All P0/P1 test suites pass in CI.
- No critical/high vulnerabilities in security regression suite.
- Load test meets agreed SLO targets.
- E2E critical paths pass with artifacts retained.
