# 18 - Risk Register

**Audit Date**: 2026-04-23
**Scope**: All apps and packages in Ridendine monorepo
**Format**: ID, Risk, Category, Severity, Likelihood, Impact, Mitigation, Owner

---

## Severity / Likelihood Scale

**Severity**: Critical / High / Medium / Low
**Likelihood**: High / Medium / Low
**Impact**: Financial, Security, Data Integrity, Availability, User Experience, Development Velocity

---

## Risk Table

| ID | Risk | Category | Severity | Likelihood | Impact | Mitigation | Owner |
|----|------|----------|----------|-----------|--------|-----------|-------|
| R1 | `BYPASS_AUTH=true` shipped or defaulted in development builds, allowing any user to access any route without authentication | Security | Critical | High | Security - unauthorized access to all roles and data | Remove BYPASS_AUTH env var entirely. If needed for local dev, require explicit `NODE_ENV=development` guard. Audit git history for any commits where this was set. | Lead Engineer |
| R2 | No input validation on most API routes - request bodies accepted without Zod parsing, enabling malformed data, injection attempts, and schema violations | Security | High | High | Security + Data Integrity - invalid data written to DB, potential injection | Add Zod schema validation to every `route.ts` handler before processing. Use shared validators from `@ridendine/validation`. | Backend Lead |
| R3 | Mock Stripe refund IDs hardcoded in ops-admin refund processing code - real customer money not being returned while system marks refund as processed | Financial | Critical | High | Financial - customers not receiving refunds, regulatory/chargeback risk | Integrate real Stripe `refunds.create()` API call. Add integration tests against Stripe test mode. Log real refund IDs in DB. | Payments Engineer |
| R4 | Near-zero automated test coverage across all apps - only 4 test files in web, 3 in engine, 0 in ops-admin/chef-admin/driver-app | Quality | High | High | Development Velocity + Reliability - bugs not caught before production | Set coverage gates in CI/CD (min 70% overall). Add tests in priority order: engine orchestrators, API routes, critical UI flows. | All Engineers |
| R5 | Supabase generated types stale - 20+ tables added to schema with no corresponding TypeScript types regenerated, causing type mismatches and runtime errors | Development | Medium | High | Development Velocity + Data Integrity - TypeScript safety net broken | Run `pnpm db:generate` immediately. Add to CI/CD as automated step. Block PRs that add migrations without regenerating types. | Backend Lead |
| R6 | No rate limiting on any API route - auth endpoints (`/api/auth/login`, `/api/auth/signup`) can be brute-forced without restriction | Security | Medium | Medium | Security - credential stuffing, account enumeration | Add rate limiting middleware using Upstash Redis or Vercel Edge middleware. Auth endpoints: 10 req/min. General API: 100 req/min. | Backend Lead |
| R7 | No pagination on any list view - orders list, chef list, driver list, etc. load all records from DB, which will fail at scale | Performance | Medium | High | Availability - queries time out as data grows, pages become unusable | Add `LIMIT`/`OFFSET` or cursor-based pagination to all repository list methods. Add `meta: { page, total, pageSize }` to API responses. | Backend Lead |
| R8 | Concurrent ops-admin actions lack database-level locking - two ops agents can approve the same chef or process the same refund simultaneously | Data Integrity | Medium | Low | Data Integrity - duplicate approvals, double refunds, inconsistent state | Add optimistic locking (version column) or SELECT FOR UPDATE in critical flows. Use DB transactions in engine orchestrators. | Backend Lead |
| R9 | 22 database tables are unreferenced in any repository or application code, creating schema drift and maintenance confusion | Maintenance | Low | Medium | Development Velocity - unclear what is live, what is legacy, what is future | Audit each unreferenced table. Document purpose, mark as deprecated if unused, create repositories for those that should be used. | Backend Lead |
| R10 | Email and push notification sending is not implemented - `@ridendine/notifications` defines templates but no sending provider (Resend, SendGrid, etc.) is integrated | Business | High | High | User Experience - customers receive no order confirmations, chefs receive no order alerts, drivers receive no delivery offers | Integrate Resend (recommended, already in env vars as optional). Wire notification calls in engine orchestrators at status transitions. | Full-Stack Engineer |
| R11 | No monitoring, structured logging, or observability - only raw `console.log`/`console.error` calls, no alerting, no error tracking (Sentry, Datadog, etc.) | Operations | High | High | Availability - production failures are invisible until users report them | Add structured logging (Pino or Winston). Integrate Sentry for error tracking. Add health check endpoints. Set up uptime monitoring. | DevOps / Lead Engineer |
| R12 | All four apps share a single Supabase instance with no read replicas or connection pooling configuration - a single heavy query can degrade all apps | Availability | Medium | Medium | Availability - one app's traffic spike degrades all other apps | Configure Supabase connection pooler (PgBouncer). Add read replica for analytics/reporting queries. Set query timeouts per app. | DevOps |
| R13 | Fee percentages (8% service fee, 13% HST, $5 delivery base) are hardcoded constants in engine business logic, not configurable from ops-admin platform settings | Business | Low | Medium | Business Flexibility - fee changes require code deploy instead of admin config | Move fee constants to `platform_settings` table. Create ops-admin UI for fee management. Engine reads from DB with Redis cache. | Backend Lead |
| R14 | No backup or recovery strategy is documented - Supabase provides automated backups but no point-in-time recovery plan, no data export procedures, and no RTO/RPO targets defined | Operations | High | Low | Availability + Data Integrity - catastrophic data loss in worst case | Document backup schedule (Supabase free tier: 7-day, Pro: 30-day). Define RTO/RPO. Test restore procedure quarterly. Document manual export procedures for critical tables. | DevOps / Lead Engineer |
| R15 | No CI/CD pipeline exists - all code is manually deployed, no automated tests run on pull requests, no lint or type-check gates | Development | High | High | Development Velocity + Reliability - regressions ship undetected, deployment is manual and error-prone | Set up GitHub Actions: on PR - lint, typecheck, tests; on merge to main - build and deploy to staging; on tag - deploy to production. | Lead Engineer |

---

## Risk Heat Map

```
           LIKELIHOOD
           High    Medium    Low
          +--------+--------+------+
Critical  | R1, R3 |        |      |
          +--------+--------+------+
High      | R2, R4 | R10,   | R14  |
Severity  | R10,   | R11    |      |
          | R11,   |        |      |
          | R15    |        |      |
          +--------+--------+------+
Medium    | R5, R6 | R8,    | R8   |
          | R7     | R12,   |      |
          |        | R13    |      |
          +--------+--------+------+
Low       |        | R9     |      |
          +--------+--------+------+
```

---

## Critical Path

The following risks must be resolved before production deployment:

1. **R1 - BYPASS_AUTH** - Deploy blocker. Fix immediately.
2. **R3 - Mock Stripe refunds** - Deploy blocker. Fix before handling any real money.
3. **R2 - No input validation** - Deploy blocker. Every API route is currently unsafe.
4. **R10 - No notifications** - Business blocker. Core user flows are broken without email.
5. **R15 - No CI/CD** - Development blocker. Cannot safely make any of the above fixes without automated regression detection.

---

## Risk Review Cadence

| Frequency | Activity |
|-----------|---------|
| Weekly | Review Critical and High risks until resolved |
| Monthly | Full risk register review |
| Per release | Confirm all Critical risks resolved before deploy |
| Quarterly | Add newly discovered risks, retire resolved risks |

---

## Related Files

- `19-priority-fix-roadmap.md` - Actionable fix schedule for these risks
- `20-observability-and-test-coverage-audit.md` - Detail on R4 and R11
- `21-env-config-secrets-dependency-audit.md` - Detail on R1 and R6
- `22-payment-order-dispatch-lifecycle.md` - Detail on R3
