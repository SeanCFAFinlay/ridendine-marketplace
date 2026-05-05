# Ride N Dine — Complete Repository Map

> Generated: 2026-04-20 | Repo: RIDENDINEV1 | Branch: master

## What This Is

A complete structural mapping of the Ride N Dine monorepo — every file, route, component, API, database table, integration, and business workflow documented, connected, and classified.

This vault is a **read-only architectural reference**. No code changes are proposed in the main sections.

---

## Navigation

### Structure & Topology
- [[Repo Tree]] — Full directory listing classified by domain
- [[System Topology]] — High-level architecture diagram and layer map
- [[Domain Map]] — Domain ownership boundaries

### Application Maps
- [[Route Inventory]] — Every page, API route, and middleware across all 4 apps
- [[Component Inventory]] — Every UI component classified and connected
- [[Data Flow Master Map]] — End-to-end data flows for all core workflows

### Backend & Data
- [[Database Map]] — All 36+ tables, columns, relationships, RLS policies
- [[API and Service Map]] — Every API route, engine orchestrator, and service
- [[Auth and Roles Map]] — Auth providers, middleware, role gating, access control

### Cross-Cutting Concerns
- [[State Management Map]] — Local state, context, query caching, realtime
- [[Integration Map]] — Supabase, Stripe, Leaflet, push notifications
- [[Business Control Map]] — What controls what in the business domain

### Audit & Planning
- [[Connection Audit]] — Fully connected vs partial vs orphaned vs placeholder
- [[Gaps and Unknowns]] — Things that can't be confirmed from code alone
- [[Enhancement Planning Inputs]] — Future enhancement priorities (mapping only)

### Domain Deep Dives
- [[Customer Domain]] | [[Chef Domain]] | [[Driver Domain]] | [[Admin Domain]]
- [[Orders Domain]] | [[Menus Domain]] | [[Payments Domain]]
- [[Notifications Domain]] | [[Tracking Domain]] | [[Shared Infrastructure]]

### Graphs
- [[Graphs/repo_topology.mmd|System Topology Graph]]
- [[Graphs/domain_relationships.mmd|Domain Relationships]]
- [[Graphs/order_lifecycle.mmd|Order Lifecycle]]
- [[Graphs/auth_roles_access.mmd|Auth & Roles Access]]
- [[Graphs/ui_to_api_to_db.mmd|UI → API → DB Flow]]

---

## Stack Summary

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | Next.js 14 (App Router) × 4 apps |
| Language | TypeScript (strict) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (email/password) |
| Payments | Stripe (PaymentIntents + Connect Express) |
| Maps | Leaflet + OpenStreetMap |
| Styling | Tailwind CSS (shared config) |
| Validation | Zod schemas |
| State | React Context + Supabase Realtime |
| Deployment | Vercel (configured) |

## App Ports

| App | Port | Audience |
|-----|------|----------|
| `apps/web` | 3000 | Customers |
| `apps/chef-admin` | 3001 | Chefs |
| `apps/ops-admin` | 3002 | Operations team |
| `apps/driver-app` | 3003 | Drivers (PWA) |

## Package Count

- **4** Next.js applications
- **9** shared packages (`@ridendine/*`)
- **9** database migrations
- **36+** database tables
- **14** repository classes
- **6** engine orchestrators
- **30+** Zod validation schemas
- **8** role types
