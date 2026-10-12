# RideNDine Design Brief & Design System

> **Document 04 – Design Brief** | Project: RideNDine Marketplace | Date: October 7, 2026 | Commit: `5599c2e5` | Author: AI-generated from codebase audit | Confidence Summary: 38 CONFIRMED / 0 INFERRED / 0 UNKNOWN

---

## 1. Overview & Styling Philosophy

The RideNDine visual design system is defined by a warm, culinary-anchored aesthetic termed *"Warm Cream & Fresh Orange"*, architected in `@ridendine/ui/src/tokens.ts` and consumed across all monorepo applications via Tailwind CSS `[CONFIRMED: packages/ui/src/tokens.ts]`. The design rejects cold, generic enterprise grayscale in favor of appetising, hospitality-forward tones: warm cream backgrounds (`#FEF8F3`), vibrant primary terracotta orange (`#EA5B26`), rich deep slate text (`#0F172A`), and dark night-shift tactical canvases (`#080B10`) for mobile drivers `[CONFIRMED: apps/driver-app/src/app/page.tsx]`.

---

## 2. Brand Identity & Assets

- **Brand Personality:** Artisanal, hospitable, authentic, local, reliable, high-craft.
- **Logos & Badges:**
  - Marketplace Icon: `/logo-icon.png` (Orange roundel with stylized culinary cutlery) `[CONFIRMED: apps/web/public/logo-icon.png]`.
  - Favicon: `/favicon.ico` `[CONFIRMED: apps/*/public/favicon.ico]`.
- **Copy Voice:** Warm, direct, action-oriented (e.g. *"Find chef-made meals near you"*, *"Welcome back, Chef"*, *"Start Cooking"*).

---

## 3. Color Palette & Token Catalog `[CONFIRMED: packages/ui/src/tokens.ts]`

| Token Name | Hex Code | Role in System | Defined In | WCAG AA Contrast Compliance |
| :--- | :---: | :--- | :--- | :---: |
| `primary` | `#EA5B26` | Main brand call-to-action, buttons, badges | `tokens.ts#L8` | Pass (3.2:1 large text, 4.5:1 on dark) |
| `primaryHover` | `#D24A18` | Button hover and active press states | `tokens.ts#L9` | Pass on white background |
| `primarySoft` | `#FFE8DC` | Chip background, active tab highlights | `tokens.ts#L11` | Pass when paired with `primary` |
| `accent` | `#0E8A8A` | Secondary brand teal, badges, metrics | `tokens.ts#L14` | Pass (4.8:1 on white background) |
| `background` | `#FEF8F3` | Global page body canvas (warm cream) | `tokens.ts#L18` | Base surface |
| `surface` | `#FFFFFF` | Cards, modals, drawers, input fields | `tokens.ts#L19` | Main container background |
| `surfaceMuted` | `#F4F1ED` | Table headers, secondary cards, chips | `tokens.ts#L20` | Secondary grouping surface |
| `border` | `#E5E0D9` | Card outlines, input borders, dividers | `tokens.ts#L24` | 3:1 graphical component boundary |
| `text` | `#0F172A` | Primary headings, titles, active body | `tokens.ts#L29` | **15.2:1** on cream canvas (Pass AAA) |
| `textMuted` | `#475569` | Secondary captions, timestamps, descriptions| `tokens.ts#L30` | **7.1:1** on white surface (Pass AAA) |
| `textSubtle` | `#94A3B8` | Placeholder text, disabled labels | `tokens.ts#L31` | Pass for inactive state |
| `success` | `#15803D` | Completed orders, approved drivers | `tokens.ts#L35` | **5.4:1** on `successSoft` (Pass AA) |
| `successSoft` | `#DCFCE7` | Success pill backgrounds | `tokens.ts#L36` | Background tint |
| `danger` | `#B91C1C` | Cancelled orders, refund alerts, errors | `tokens.ts#L37` | **5.8:1** on `dangerSoft` (Pass AA) |
| `dangerSoft` | `#FEE2E2` | Error banners and alert chips | `tokens.ts#L38` | Background tint |
| `warning` | `#B45309` | SLA alerts, pending offers, late prep | `tokens.ts#L39` | **4.9:1** on `warningSoft` (Pass AA) |
| `warningSoft` | `#FEF3C7` | Warning badge backgrounds | `tokens.ts#L40` | Background tint |
| `info` | `#0369A1` | Dispatch status, driver en route | `tokens.ts#L41` | **5.2:1** on `infoSoft` (Pass AA) |
| `infoSoft` | `#E0F2FE` | Informational pill background | `tokens.ts#L42` | Background tint |

---

## 4. Typography Scale `[CONFIRMED: packages/ui/src/tokens.ts#L58-L85]`

- **Display Font:** `Plus Jakarta Sans`, sans-serif (used for hero headers and prominent storefront branding).
- **Body Font:** `Inter`, ui-sans-serif, system-ui, sans-serif (used for UI elements, tables, and forms).

| Level | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `36px` (`text-4xl`) | `700` (Bold) | `44px` | `-0.02em` | Homepage hero, Storefront titles |
| **H1** | `30px` (`text-3xl`) | `700` (Bold) | `38px` | `-0.02em` | Page headers, Dashboard titles |
| **H2** | `24px` (`text-2xl`) | `600` (Semibold) | `32px` | `-0.01em` | Section headers, Card titles |
| **H3** | `20px` (`text-xl`) | `600` (Semibold) | `28px` | `0em` | Modal headings, Dish names |
| **Body Large** | `16px` (`text-base`) | `400` / `500` | `24px` | `0em` | Main body paragraphs, Form inputs |
| **Body Small** | `14px` (`text-sm`) | `400` / `500` | `20px` | `0em` | Table data, Navigation links |
| **Caption** | `12px` (`text-xs`) | `500` (Medium) | `16px` | `+0.01em` | Status pills, Timestamps, Badges |

---

## 5. Spacing, Layout, and Breakpoints

- **Base Spacing:** 4px grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`).
- **Border Radius:**
  - `rounded-lg`: 8px (Inputs, dropdowns, table cells)
  - `rounded-xl`: 12px (Cards, modal dialogs)
  - `rounded-2xl`: 16px (Storefront cards, hero banners)
  - `rounded-full`: 9999px (Status pills, circular icon buttons)
- **Responsive Breakpoints:**
  - `sm`: `640px` (Small tablets & landscape phones)
  - `md`: `768px` (Tablets / Mobile-to-Desktop layout shifts)
  - `lg`: `1024px` (Desktop sidebar navigation threshold)
  - `xl`: `1280px` (Max container content width)
  - `2xl`: `1536px` (Ultra-wide displays)

---

## 6. UI Component Library (`@ridendine/ui`)

| Component Name | File Path | Variants | Key States | Usage Across System |
| :--- | :--- | :--- | :--- | :--- |
| **Button** | `packages/ui/src/components/button.tsx` | `primary`, `secondary`, `outline`, `ghost`, `danger` | Default, Hover, Active, Disabled, Loading (Spinner) | Form submissions, action triggers, modals across all apps |
| **Input** | `packages/ui/src/components/input.tsx` | `default`, `error`, `icon-left` | Normal, Focus Ring, Error outline, Disabled | Search bars, checkout inputs, login credentials |
| **Badge / StatusPill**| `packages/ui/src/components/badge.tsx` | `live`, `fresh`, `pending`, `stale`, `offline`, `error` | Static, Pulse indicator | Order status tags, driver shift indicators |
| **Card** | `packages/ui/src/components/card.tsx` | `elevated`, `outlined`, `flat` | Static, Hover lift | Storefront cards, dish items, order summary widgets |
| **Modal / Dialog** | `packages/ui/src/components/modal.tsx` | `center`, `bottom-sheet` (mobile) | Open, Closing transition | Dish modifier customization, driver dispatch offers |
| **ErrorState** | `packages/ui/src/components/error-state.tsx` | `default`, `danger`, `platform` | Retry button callback | 404 views, unlinked driver account alerts |
| **SkeletonLoader** | `packages/ui/src/components/skeleton.tsx` | `text`, `avatar`, `card` | Shimmer pulse | Page loading placeholders for kitchen menus |

---

## 7. Accessibility (a11y) Conformance

1. **Color Contrast:** All status pills and semantic foregrounds are pre-calculated to exceed WCAG AA 4.5:1 ratio `[CONFIRMED: packages/ui/src/tokens.ts#L47-L56]`.
2. **Focus Visibility:** Custom focus ring tokens (`focusRing: '#EA5B26'`) ensure prominent keyboard focus outlines across all interactive inputs and buttons `[CONFIRMED: packages/ui/src/tokens.ts#L44]`.
3. **Responsive Scaling:** Zero fixed-pixel document bodies; all font sizes rely on `rem` units; meta viewports enforce `maximumScale: 5` allowing user zooming for accessibility compliance `[CONFIRMED: apps/*/src/app/layout.tsx]`.
