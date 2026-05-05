# Ridendine Full System Audit

**Audit Date**: 2026-04-23
**Project**: Ridendine - Chef-First Food Delivery Marketplace
**Stack**: Next.js 14 + Supabase + Stripe + pnpm/Turborepo

---

## Navigation

### System Overview
- [[Apps]] - All 4 applications with maturity ratings
- [[Pages]] - All 56 pages across apps
- [[APIs]] - All 49+ API routes
- [[Database]] - All 36+ tables organized by domain
- [[Roles]] - Customer, Chef, Driver, Ops Admin capabilities

### Technical Reference
- [[Integrations]] - Supabase, Stripe, Vercel, real-time subscriptions
- [[Risks]] - Top risks with severity ratings
- [[Merge-Plan]] - Phased consolidation strategy

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Applications | 4 Next.js apps |
| Shared Packages | 9 |
| Total Pages | 56 |
| API Routes | 49+ |
| Database Tables | 36 |
| Engine Orchestrators | 7 |
| DB Repositories | 22 |
| Test Files | 7 (critically low) |

---

## Architecture Summary

```
Customer Web (3000) ──┐
Chef Admin (3001) ────┤──→ 9 Shared Packages ──→ Supabase
Ops Admin (3002) ─────┤                        ──→ Stripe
Driver App (3003) ────┘                        ──→ Vercel (4x)
```

---

## Critical Issues (Top 3)

1. **BYPASS_AUTH in dev/preview** - All 4 apps skip auth enforcement in non-production environments. See [[Risks#bypass-auth]].
2. **No test coverage** - Only 7 test files across the entire codebase. See [[Risks#test-coverage]].
3. **Real-time missing** - Chef dashboard has no real-time push for new orders. See [[Risks#realtime-missing]].

---

## Audit Files

| File | Description |
|------|-------------|
| `00-executive-summary.md` | High-level findings and blockers |
| `08-data-model-and-db-usage.md` | Database analysis |
| `graphs/system-graph.mmd` | Full system dependency graph |
| `graphs/app-dependency-graph.mmd` | App-to-package dependencies |
| `graphs/route-to-api-graph.mmd` | Page routes to API routes |
| `graphs/role-journey-graph.mmd` | User journey flows |
| `graphs/db-entity-graph.mmd` | ER diagram |
| `graphs/merge-strategy-graph.mmd` | Consolidation plan |
