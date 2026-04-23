# Ridendine Full System Audit - Master Index

**Project**: Ridendine Food Delivery Marketplace
**Audit Date**: 2026-04-23
**Auditor**: Coder Agent (Claude Sonnet 4.6)
**Stack**: Next.js 14 + Supabase + Stripe + pnpm/Turborepo

---

## What This Audit Package Contains

This audit package provides a complete technical assessment of the Ridendine monorepo across architecture, API coverage, database design, security, role modeling, integration health, and production readiness.

---

## File Index

### Root Audit Files

| File | Description | Key Findings |
|------|-------------|-------------|
| `00-executive-summary.md` | High-level findings, maturity ratings, critical blockers | 3 critical blockers identified |
| `08-data-model-and-db-usage.md` | Database table analysis, query patterns, RLS coverage | Schema drift between docs and reality |
| `26-graph-nodes-and-edges.json` | Machine-readable graph: 85+ nodes, 60+ edges | Full system topology as JSON |
| `27-graph-mermaid.md` | Master Mermaid graph combining all views | System + order flow + risk heat map |
| `28-obsidian-index.md` | This file - master navigation for audit package | - |

---

### Graph Files (`graphs/`)

| File | Description | Use For |
|------|-------------|---------|
| `graphs/system-graph.mmd` | All apps, packages, Supabase with dependency arrows | Architecture overview |
| `graphs/app-dependency-graph.mmd` | Each app → which packages it depends on | Package audit |
| `graphs/route-to-api-graph.mmd` | Page routes → API routes for all 4 flows | API coverage check |
| `graphs/role-journey-graph.mmd` | User journeys for all 4 roles + status transitions | UX/flow review |
| `graphs/db-entity-graph.mmd` | ER diagram for all major entities | Data modeling |
| `graphs/merge-strategy-graph.mmd` | Current 4-app vs proposed unified architecture | Consolidation planning |

**How to render**: Paste any `.mmd` file content into [mermaid.live](https://mermaid.live) or open in VS Code with Mermaid Preview extension.

---

### Obsidian Notes (`obsidian/`)

Open the `obsidian/` directory as an Obsidian vault to get the full graph view with backlinks.

| Note | Description | Links To |
|------|-------------|---------|
| `obsidian/Home.md` | Index page, quick stats, critical issues | All other notes |
| `obsidian/Apps.md` | All 4 apps with maturity, gaps, dependencies | Pages, APIs, Roles, Database |
| `obsidian/Pages.md` | All 56 pages with status and role access | Apps, APIs, Roles |
| `obsidian/APIs.md` | All 49+ API routes with auth, status, DB tables | Database, Apps |
| `obsidian/Database.md` | All 36+ tables by domain with relationships | APIs, Apps |
| `obsidian/Roles.md` | Customer, Chef, Driver, Ops Admin capabilities | Pages, APIs |
| `obsidian/Integrations.md` | Supabase, Stripe, Vercel, Email, Push | APIs, Database |
| `obsidian/Risks.md` | 14 risks with severity, affected nodes, mitigations | Apps, APIs, Database |
| `obsidian/Merge-Plan.md` | 3-phase consolidation strategy with options A/B/C | Apps, Risks |

---

## Critical Findings Summary

### Security (Fix Immediately)
- **BYPASS_AUTH**: All 4 apps skip authentication in `development` or when `BYPASS_AUTH=true` in any non-production Vercel deployment. Ops-admin and chef-admin are fully exposed. Remove `NODE_ENV === 'development'` from middleware bypass immediately.

### Quality (Fix Before First Production Traffic)
- **No test coverage**: Only 7 test files exist. Core flows (checkout, dispatch, refunds) have zero regression tests. Target: 80% overall, 90% for `@ridendine/engine`.
- **Notification infrastructure missing**: Chef real-time push, driver push notifications, and email delivery provider are all unimplemented.

### Operational Gaps (Fix Within 2 Weeks)
- Chef dashboard has no real-time order push (must manually refresh)
- Ops live map is a placeholder
- Stripe Connect payout disbursement not wired (chefs cannot receive earnings)

### Production Readiness Score
| App | Score |
|-----|-------|
| apps/web | 80% |
| apps/chef-admin | 75% |
| apps/ops-admin | 65% |
| apps/driver-app | 70% |
| **Overall** | **~73%** |

---

## Graph View Setup (Obsidian)

1. Open Obsidian
2. Open Vault → Select `audit/ridendine-full-system-audit/obsidian/` directory
3. Open Graph View (Ctrl+G or Cmd+G)
4. All `[[wiki links]]` between notes will form the knowledge graph
5. Start from `Home.md` to navigate

**Expected graph clusters**:
- Apps cluster (Home → Apps → Pages → APIs)
- Data cluster (Database → APIs → Integrations)
- Risk cluster (Risks → Apps → APIs → Merge-Plan)

---

## Quick Reference

### Key Numbers
| Metric | Value |
|--------|-------|
| Apps | 4 |
| Packages | 9 |
| Pages | 56 |
| API routes | 49+ |
| DB tables | 36+ (41 detailed count) |
| Engine orchestrators | 7 |
| DB repositories | 22 |
| Test files | 7 (target: 50+) |
| Critical risks | 3 |
| High risks | 4 |
| Medium risks | 4 |

### Priority Action List
1. Remove BYPASS_AUTH security bypass from all 4 middleware files
2. Add `pnpm db:generate` to CI and reconcile type count
3. Wire Supabase real-time to chef order queue
4. Select email provider and wire `@ridendine/notifications`
5. Implement Web Push for driver-app
6. Wire Stripe Connect payout disbursement
7. Build live map for ops-admin
8. Add test coverage to 80% (prioritize engine orchestrators)
9. Add pagination to all list routes
10. Implement driver history page and review submission API
