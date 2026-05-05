# Phase 11 — UI / UX wiring (static + build evidence)

## Boot / build

`pnpm build` **passed** for web, chef-admin, ops-admin, driver-app — **VERIFIED** compile + typecheck phase inside Next build.

## Per-app notes

### Customer web (`apps/web`)

- Checkout, cart, auth, order confirmation routes present in build output.  
- Forms generally call internal `/api/*` — pattern seen in tests (`customer-ordering.test.tsx`).  
- **Error / loading states:** partial coverage via Jest; no full manual UX pass.

### Chef admin

- Dashboard menu, orders, availability routes in build.  
- **Lint scope is narrow** — only subset of files in `package.json` lint script; **full** ESLint not gated in CI for entire src.

### Ops admin

- Large dashboard surface; realtime components show `act()` warnings in tests — low UX risk but indicates async polish backlog.

### Driver app

- Delivery page + APIs in build.  
- Mobile PWA suitability — **IRR-025** partial (checklist without full human sign-off).

## TODO / placeholder grep

**Not executed** in this audit window — recommend `rg "TODO|FIXME|placeholder" apps/` before launch.

## Protected pages

Middleware protects selected routes; APIs re-enforce — see `05_AUTH_RBAC_SERVICE_ROLE_AUDIT.md`.

## Broken links

**Not systematically crawled** — recommend link checker in staging.
