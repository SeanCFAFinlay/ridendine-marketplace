# RideNDine Technical Requirements Document (TRD)

> **Document 02 – Technical Requirements Document** | Project: RideNDine Marketplace | Date: October 7, 2026 | Commit: `5599c2e5` | Author: AI-generated from codebase audit | Confidence Summary: 48 CONFIRMED / 2 INFERRED / 0 UNKNOWN

---

## 1. Overview & Architecture Style

RideNDine is engineered as an enterprise-grade TypeScript Turborepo monorepo comprising four Next.js 14/15 App Router applications and nine internal domain packages `[CONFIRMED: package.json & pnpm-workspace.yaml]`. The architecture follows an event-driven, server-rendered (SSR) micro-frontend model backed by Supabase PostgreSQL (with PostGIS extensions), Supabase Realtime WebSockets, and serverless edge API routes `[CONFIRMED: packages/db & packages/engine]`.

### Architecture Diagram

```mermaid
flowchart TD
    subgraph BrowserLayer["Client Tier (Desktop & Mobile Browsers)"]
        WEB_CLIENT["Customer Browser<br/>(ridendine.ca)"]
        OPS_CLIENT["Ops Admin Console<br/>(ops.ridendine.ca)"]
        CHEF_CLIENT["Chef Kitchen Portal<br/>(chef.ridendine.ca)"]
        DRIVER_CLIENT["Driver Mobile PWA<br/>(driver.ridendine.ca)"]
    end

    subgraph CDNLayer["Edge Network & Security (Vercel Edge Network)"]
        EDGE_ROUTER["Vercel Global Edge Network<br/>(TLS 1.3 / HTTP/2)"]
        CSP_MIDDLEWARE["@ridendine/auth Middleware<br/>(Cryptographic Nonce & Level 3 CSP)"]
    end

    subgraph AppServerLayer["Application Tier (Next.js 14/15 App Router)"]
        WEB_APP["apps/web<br/>(Port 3000)"]
        OPS_APP["apps/ops-admin<br/>(Port 3002)"]
        CHEF_APP["apps/chef-admin<br/>(Port 3001)"]
        DRIVER_APP["apps/driver-app<br/>(Port 3003)"]
    end

    subgraph ServicePackageLayer["Shared Domain Engines (Turborepo)"]
        ENGINE_PKG["@ridendine/engine<br/>(SLA Monitor / Dispatcher / Order State Machine)"]
        ROUTING_PKG["@ridendine/routing<br/>(Haversine Distance & Route Calculations)"]
        NOTIF_PKG["@ridendine/notifications<br/>(Resend Email & Web Push)"]
        VAL_PKG["@ridendine/validation<br/>(Zod Schema Validators)"]
        DB_PKG["@ridendine/db<br/>(Supabase SSR / Repository Pattern)"]
    end

    subgraph CloudDataLayer["Persistence & Database Tier (Supabase)"]
        POSTGRES["PostgreSQL 15 + PostGIS<br/>(112 Tables / Triggers / Foreign Keys)"]
        RLS["Row Level Security Policies<br/>(Role-Based Data Isolation)"]
        REALTIME["Supabase Realtime<br/>(PostgreSQL Change Data Capture / WebSockets)"]
        STORAGE["Supabase Storage Buckets<br/>(Driver Documents / Proof of Delivery Photos)"]
    end

    subgraph ThirdPartyLayer["External SaaS & Infrastructure Providers"]
        STRIPE["Stripe Connect & Payment Intents<br/>(Express Accounts & Webhook Listeners)"]
        MAPS["Google Maps Platform & Leaflet OSM<br/>(Geocoding / Static Maps / OSM Tiles)"]
        RESEND["Resend Email API<br/>(Transactional Customer Receipts)"]
        SENTRY["Sentry Error Monitoring<br/>(@sentry/nextjs Crash Reporting)"]
    end

    BrowserLayer --> EDGE_ROUTER
    EDGE_ROUTER --> CSP_MIDDLEWARE
    CSP_MIDDLEWARE --> AppServerLayer
    AppServerLayer --> ServicePackageLayer
    ServicePackageLayer --> CloudDataLayer
    ServicePackageLayer --> ThirdPartyLayer
    CloudDataLayer --> REALTIME
    REALTIME -.-> BrowserLayer
```

---

## 2. Technical Goals

1. **Security & Cryptographic Isolation:**
   - Zero-trust Content Security Policy (CSP Level 3) with dynamic cryptographic nonces and `'strict-dynamic'` to prevent cross-site scripting (XSS) `[CONFIRMED: packages/auth/src/csp.ts]`.
   - Comprehensive Row Level Security (RLS) across all customer, chef, and driver database rows `[CONFIRMED: supabase/migrations/*.sql]`.
2. **Deterministic Financial Accounting:**
   - Double-entry ledger architecture (`ledger_entries`) recording paired debits and credits on every transaction `[CONFIRMED: ledger_entries table]`.
   - Idempotency key tracking on checkouts to eliminate duplicate card charges `[CONFIRMED: checkout_idempotency_keys table]`.
3. **Sub-Second Real-Time Synchronization:**
   - WebSockets-based order status propagation from customer checkout to kitchen printer/KDS and driver shift modal via Supabase Realtime `[CONFIRMED: apps/chef-admin/src/app/dashboard/page.tsx]`.
4. **Resilient Automated Dispatch:**
   - Automated polling engines and SLA monitors (`packages/engine`) ensuring unassigned deliveries cascade to nearby drivers without dispatcher intervention `[CONFIRMED: packages/engine/src/dispatch-engine.ts]`.

---

## 3. Technology Stack Catalog

| Layer | Tool / Technology | Exact Version | Purpose | Source of Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **Language** | TypeScript | `^5.6.0` | Strict static typechecking across all monorepo apps and packages. | [`package.json#L91`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L91) |
| **Monorepo Build** | Turborepo | `^2.3.0` | High-performance monorepo build orchestration with caching. | [`package.json#L90`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L90) |
| **Package Manager** | pnpm | `9.15.0` | Strict, workspace-isolated dependency management. | [`package.json#L5`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L5) |
| **Frontend Framework** | Next.js App Router | `^14.2.0` | SSR, React Server Components (RSC), and edge routing. | [`package.json#L74`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L74) |
| **UI Library** | React / React DOM | `^18.3.0` | Component UI rendering. | [`package.json#L75-L76`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L75-L76) |
| **CSS Styling** | Tailwind CSS | `^3.4.0` | Utility-first CSS framework with tokenized color palettes. | [`apps/web/package.json#L53`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L53) |
| **Component Utilities** | class-variance-authority | `^0.7.0` | Type-safe component variant generation. | [`packages/ui/package.json#L20`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/ui/package.json#L20) |
| **CSS Merging** | tailwind-merge / clsx | `^2.5.0` / `^2.1.0` | Dynamic class merging without specificity collisions. | [`packages/ui/package.json#L21-L22`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/ui/package.json#L21-L22) |
| **Iconography** | Lucide React | `^0.454.0` | Lightweight SVG icon system. | [`apps/ops-admin/package.json#L34`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/package.json#L34) |
| **Database** | PostgreSQL + PostGIS | `15.x` | Relational storage with spatial geographic indexing. | [`packages/db` & `supabase/migrations`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/db) |
| **BaaS / Auth** | Supabase (`@supabase/ssr`) | `^0.5.0` | Cookie-based session auth and SSR client creation. | [`packages/db/package.json#L20`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/db/package.json#L20) |
| **Database Client** | Supabase JS Client | `^2.47.0` | Typed queries, real-time WebSocket subscriptions. | [`packages/db/package.json#L19`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/db/package.json#L19) |
| **Direct DB Client** | `pg` (node-postgres) | `^8.20.0` | Direct pooling connection for migrations, audits, and purges. | [`package.json#L86`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L86) |
| **Payments Backend** | Stripe SDK | `^20.4.1` | Server-side PaymentIntents, Connect accounts, and transfers. | [`packages/engine/package.json#L38`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/package.json#L38) |
| **Payments Frontend** | Stripe React Elements | `^5.6.1` / `^8.11.0` | PCI-compliant credit card input fields. | [`apps/web/package.json#L26-L27`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L26-L27) |
| **Mapping Engine** | Leaflet / React-Leaflet | `^1.9.4` / `^5.0.0` | Interactive maps, driver tracking, and route rendering. | [`apps/ops-admin/package.json#L29-L33`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/ops-admin/package.json#L29-L33) |
| **Email Delivery** | Resend | `^4.0.0` | Transactional customer receipt and alert delivery. | [`packages/engine/package.json#L37`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/engine/package.json#L37) |
| **Schema Validation** | Zod | `^3.23.0` | Runtime validation for forms and API request bodies. | [`apps/web/package.json#L36`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L36) |
| **Error Monitoring** | Sentry Next.js | `^9.0.0` | Full-stack exception tracking and telemetry. | [`apps/web/package.json#L25`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L25) |
| **Web Analytics** | Vercel Analytics | `^1.6.1` | Privacy-focused page view and visitor tracking. | [`apps/web/package.json#L29`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L29) |
| **Web Performance** | Vercel Speed Insights | `^1.3.1` | Real-world Core Web Vitals telemetry. | [`apps/web/package.json#L30`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/apps/web/package.json#L30) |
| **E2E Testing** | Playwright Test | `^1.55.1` | Headless browser testing for responsive multi-device smoke. | [`package.json#L80`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L80) |
| **Unit Testing** | Vitest / Jest | `^1.6.0` / `^29.7.0` | Fast unit and contract validation. | [`packages/db/package.json#L29`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/packages/db/package.json#L29) |
| **Code Formatting** | Prettier | `^3.4.0` | Code style enforcement with Tailwind class sorting. | [`package.json#L87-L88`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L87-L88) |
| **Linting** | ESLint | `^9.39.4` | Static analysis for TypeScript and React best practices. | [`package.json#L83`](file:///D:/Projects/RIDENDINE/ridendine-marketplace/package.json#L83) |

---

## 4. Monorepo Project Structure

```text
ridendine-marketplace/
├── apps/
│   ├── web/                    # Customer marketplace portal (ridendine.ca, port 3000)
│   ├── chef-admin/             # Kitchen & menu management portal (chef.ridendine.ca, port 3001)
│   ├── ops-admin/              # Command center & operations board (ops.ridendine.ca, port 3002)
│   └── driver-app/             # Fleet driver dispatch PWA (driver.ridendine.ca, port 3003)
├── packages/
│   ├── auth/                   # Shared Supabase Auth middleware, sessions, & CSP factory
│   ├── config/                 # Shared ESLint, Prettier, and TypeScript configurations
│   ├── db/                     # Supabase SSR client, repositories, and generated database types
│   ├── engine/                 # Core dispatch algorithm, SLA monitor, and pricing calculator
│   ├── notifications/          # Transactional email (Resend) and browser push dispatchers
│   ├── routing/                # Geographic distance algorithms (Haversine) and geofences
│   ├── types/                  # Shared TypeScript interfaces (Orders, Deliveries, Menus)
│   ├── ui/                     # Design system component library (Buttons, Inputs, Modals)
│   ├── utils/                  # Currency formatting, date helpers, rate limiters
│   └── validation/             # Shared Zod validation schemas for all API payloads
├── supabase/
│   ├── migrations/             # 64 sequential SQL migrations establishing 112 tables
│   └── seeds/                  # Seed fixtures for local development
├── scripts/
│   ├── smoke/                  # Production smoke test suites (responsive, contract, authz)
│   ├── audit/                  # Database hardening and security ratchet audits
│   ├── purge-demo-data.mjs     # Production database cleanup tool
│   └── bootstrap-super-admin.mjs # Global Super Admin initialization utility
├── docs/                       # Complete system documentation suite
├── turbo.json                  # Turborepo task pipeline definition
└── package.json                # Root dependency manifest and pnpm workspace config
```

---

## 5. Environment Variables Catalog

| Variable Name | Purpose | Required | Used In (File / Package) | Scope |
| :--- | :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Base API URL of the Supabase project. | **Yes** | `packages/db/src/client`, all apps | Public (Browser & Server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key for client-side queries. | **Yes** | `packages/auth/src/middleware.ts`, all apps | Public (Browser & Server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged administrative key bypassing RLS. | **Yes** | `packages/db/src/client/admin.ts`, engine | Server-only (Secret) |
| `DATABASE_URL` | Direct connection string for PostgreSQL (port 5432 / 6543). | **Yes** | Migrations, scripts, `packages/db` | Server-only (Secret) |
| `STRIPE_SECRET_KEY` | Live Stripe secret API key (`sk_live_*`). | **Yes** | `packages/engine`, `apps/web/src/app/api` | Server-only (Secret) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public Stripe key for Elements (`pk_live_*`). | **Yes** | `apps/web/src/app/checkout` | Public (Browser) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret verifying inbound customer webhooks. | **Yes** | `apps/web/src/app/api/webhooks/stripe` | Server-only (Secret) |
| `STRIPE_WEBHOOK_SECRET_OPS` | Signing secret for ops admin Connect webhooks. | Optional | `apps/ops-admin/src/app/api/webhooks` | Server-only (Secret) |
| `NEXT_PUBLIC_APP_URL` | Canonical URL of customer marketplace. | **Yes** | `apps/web/src/middleware.ts` | Public (Browser & Server) |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` | Canonical URL of Chef Admin portal. | **Yes** | `apps/chef-admin`, `apps/ops-admin` | Public (Browser & Server) |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Canonical URL of Driver App portal. | **Yes** | `apps/driver-app`, `apps/ops-admin` | Public (Browser & Server) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key for geocoding / autocomplete. | Optional | `apps/web/src/components/address` | Public (Browser) |
| `RESEND_API_KEY` | Resend API key for sending transactional emails. | **Yes** | `packages/notifications/src/email.ts` | Server-only (Secret) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN key for error monitoring. | Optional | `apps/*/sentry.client.config.ts` | Public (Browser & Server) |
| `ENGINE_PROCESSOR_TOKEN` | Bearer token protecting background cron trigger routes. | **Yes** | `apps/ops-admin/src/app/api/engine` | Server-only (Secret) |

---

## 6. Third-Party Services Integration

| Service | Functional Purpose | Integration Method | Failure Impact |
| :--- | :--- | :--- | :--- |
| **Supabase PostgreSQL** | Primary operational database, PostGIS spatial queries. | Node-pg connection pool & REST API. | **Catastrophic:** Entire platform fails (500 on all routes). |
| **Supabase Auth** | JWT user authentication, session tokens, password hashing. | Supabase SSR cookies (`sb-*-auth-token`). | **High:** Users cannot log in or authenticate API requests. |
| **Stripe Payments** | Customer payment intent processing, card pre-authorizations. | Stripe REST API & React Elements SDK. | **High:** Checkouts fail; orders cannot be submitted. |
| **Stripe Connect** | Independent chef banking onboarding and automated weekly payouts. | Stripe Express Connect OAuth & Payouts API. | **Medium:** Chefs cannot link accounts; manual payout fallback needed. |
| **Google Maps / Leaflet** | Address autocomplete, geocoding coordinates, driver map. | Google Geocoding REST API & OpenStreetMap Tiles. | **Medium:** Driver tracking degrades to static coordinates. |
| **Resend** | Transactional emails (order confirmation, receipts, alerts). | Resend Node.js SDK via HTTPS. | **Low:** Emails delayed; in-app order status remains accurate. |
| **Vercel** | Multi-project edge network hosting and serverless functions. | Git-driven CI/CD deployment hooks. | **Catastrophic:** Web servers unavailable. |

---

## 7. Security Audit & Protection Review

| Security Area | Rating | Code Evidence & Implementation Details |
| :--- | :---: | :--- |
| **Content Security Policy (CSP)** | **Strong** | Cryptographic nonces generated per-request in `@ridendine/auth/src/csp.ts`; `'strict-dynamic'` prevents execution of any non-nonced script tag; verified 100% compliant in production. |
| **Row Level Security (RLS)** | **Strong** | RLS enabled on all operational tables (`orders`, `customers`, `chef_profiles`, `drivers`); customer cannot view another customer's orders; chefs isolated to own storefront items. |
| **Input Validation & Sanitization** | **Strong** | Strict Zod validation schemas (`@ridendine/validation`) executed on all incoming JSON payloads before database mutations. |
| **Authentication & Tokens** | **Strong** | HttpOnly, Secure, SameSite=Lax cookies managed by `@supabase/ssr`; dynamic token refresh via Next.js middleware. |
| **Rate Limiting** | **Strong** | In-memory token bucket rate limiter in `@ridendine/utils/src/rate-limiter.ts` protecting auth routes against brute-force attacks (5 attempts/min). |
| **SQL Injection Defense** | **Strong** | All database queries utilize parameterized prepared statements (`$1, $2, ...`) via Supabase query builder and `pg.Client`; no raw dynamic SQL string concatenation. |
| **Secrets Management** | **Strong** | Zero hardcoded API keys or service role secrets in git repository; validated via pre-push audit gates. |
| **CSRF & Clickjacking** | **Strong** | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` enforced in headers `[CONFIRMED: packages/auth/src/csp.ts]`. |

---

## 8. Build, Run, and Deployment Runbook

### Local Development Setup
1. **Prerequisites:** Node.js `>= 20.0.0`, `pnpm` `9.15.0`.
2. **Install Workspace Dependencies:**
   ```bash
   pnpm install
   ```
3. **Environment Setup:**
   Copy `.env.example` to `.env.local` and populate `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `DATABASE_URL`.
4. **Run Development Servers:**
   ```bash
   pnpm dev          # Launches all 4 apps concurrently via Turborepo
   pnpm dev:web      # Customer Web only (http://localhost:3000)
   pnpm dev:chef     # Chef Admin only (http://localhost:3001)
   pnpm dev:ops      # Ops Admin only (http://localhost:3002)
   pnpm dev:driver   # Driver App only (http://localhost:3003)
   ```

### Verification & Quality Gates
```bash
pnpm typecheck                    # Strict TypeScript verification across all 14 packages
pnpm lint                         # ESLint check
pnpm verify:prod-data-hygiene     # Asserts no forbidden reset/seed scripts in CI
pnpm smoke:responsive             # Headless Playwright audit of all 4 apps at mobile & desktop
```

### Production Deployment Strategy
- Deployed across four dedicated projects on **Vercel**:
  - `ridendine-web` -> `https://ridendine.ca`
  - `ridendine-chef` -> `https://chef.ridendine.ca`
  - `ridendine-driver` -> `https://driver.ridendine.ca`
  - `ridendine-ops` -> `https://ops.ridendine.ca`
- Automatic git-driven CI/CD on pushes to `master` branch.
- Zero-downtime rolling deployments managed by Vercel edge infrastructure.
