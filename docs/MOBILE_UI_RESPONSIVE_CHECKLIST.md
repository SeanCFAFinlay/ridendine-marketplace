# Mobile / responsive UI checklist (Phase 14 / IRR-025)

Use this matrix before release or after major UI changes. **Manual sign-off** is acceptable; record date and reviewer in your release notes.

## Viewports (minimum)

| Breakpoint | Width | Apps to spot-check |
|------------|-------|---------------------|
| **Phone** | 360 × 800 | web, chef-admin, ops-admin, driver-app |
| **Large phone** | 390 × 844 | same |
| **Tablet** | 768 × 1024 | chef-admin (menu), ops-admin (tables) |
| **Desktop** | 1280 × 800 | all |

Use browser devtools device mode or real hardware for at least **one** phone size per app.

## Cross-cutting checks

| # | Check | Pass criteria |
|---|--------|----------------|
| 1 | **Horizontal scroll** | No unintended page-wide overflow; tables/maps may scroll inside a bounded region. |
| 2 | **Touch targets** | Primary actions ≥ ~44px height where feasible (`min-h-10` on chef menu actions in Phase 14). |
| 3 | **Readable text** | Body copy not below ~14px equivalent on mobile without zoom. |
| 4 | **Focus** | Keyboard / focus-visible rings visible on interactive controls. |
| 5 | **Auth flows** | Login, signup, password reset usable without horizontal panning. |
| 6 | **Checkout (web)** | Address + payment step controls reachable; no overlapping sticky footers. |

## Per-app smoke

| App | Route / surface | Notes |
|-----|-----------------|--------|
| **web** | `/`, `/checkout`, `/auth/signup` | Marketplace + cart + `PasswordStrength` from `@ridendine/ui`. |
| **chef-admin** | `/dashboard/menu` | Category cards stack; item rows stack on narrow width (Phase 14 layout). |
| **ops-admin** | `/dashboard/orders`, `/dashboard/support` | Wide tables: horizontal scroll inside table container, not whole page if possible. |
| **driver-app** | Home, delivery detail, `/auth/signup` | PWA safe areas; maps not obscuring CTAs. |

## IRR-012 (password strength)

- **Canonical component:** `PasswordStrength` in `@ridendine/ui` (`packages/ui/src/components/password-strength.tsx`).
- **Apps:** import from `@ridendine/ui` only — no duplicate implementations under `apps/*/components/auth/`.

## Sign-off

| Date | Reviewer | Web | Chef | Ops | Driver | Notes |
|------|----------|-----|------|-----|--------|-------|
| | | ☐ | ☐ | ☐ | ☐ | |

## Deferred

- Automated visual regression (Playwright screenshots) — **Phase 16+** if adopted.
- Full WCAG audit — **Phase 15** security/a11y hardening as applicable.
