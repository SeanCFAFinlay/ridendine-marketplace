// RideNDine canonical design tokens.
// Single source of truth — Tailwind preset and all components must consume from here.
// Light, warm, orange-on-cream. Brand-anchored to the customer marketplace.

export const ridendineTokens = {
  colors: {
    // Brand
    primary: '#EA5B26',
    primaryHover: '#D24A18',
    primaryActive: '#B83E13',
    primarySoft: '#FFE8DC',
    primaryFg: '#FFFFFF',

    accent: '#0E8A8A',
    accentSoft: '#D6F0EF',

    // Surfaces — layered cream → white → muted bands
    background: '#FEF8F3',
    surface: '#FFFFFF',
    surfaceMuted: '#F4F1ED',
    surfaceSubtle: '#EEF2F7',

    // Borders & dividers
    border: '#E5E0D9',
    borderStrong: '#D6CFC5',
    divider: '#F0EAE1',

    // Text
    text: '#0F172A',
    textMuted: '#475569',
    textSubtle: '#94A3B8',

    // Semantic — foregrounds darkened to Tailwind 700-tier so text on the
    // matching soft background clears WCAG AA 4.5:1 contrast.
    success: '#15803D',
    successSoft: '#DCFCE7',
    danger: '#B91C1C',
    dangerSoft: '#FEE2E2',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
    info: '#0369A1',
    infoSoft: '#E0F2FE',

    focusRing: '#EA5B26',
  },

  // Status pills — the ONLY way to render order/delivery/driver status.
  // All fg/bg pairs verified at ≥ 4.5:1 contrast (see wcag-contrast.test.ts).
  status: {
    live: { label: 'Live', fg: '#15803D', bg: '#DCFCE7' },
    fresh: { label: 'Fresh', fg: '#0369A1', bg: '#E0F2FE' },
    pending: { label: 'Pending', fg: '#B45309', bg: '#FEF3C7' },
    stale: { label: 'Stale', fg: '#B45309', bg: '#FEF3C7' },
    offline: { label: 'Offline', fg: '#475569', bg: '#F1F5F9' },
    error: { label: 'Error', fg: '#B91C1C', bg: '#FEE2E2' },
  },

  typography: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: '"Plus Jakarta Sans", Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },

  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extra: '800',
  },

  lineHeight: {
    tight: '1.15',
    snug: '1.3',
    normal: '1.5',
    relaxed: '1.65',
  },

  // 4px-base spacing scale. Tailwind classes p-4 / mt-6 / gap-8 etc. map onto this.
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },

  radius: {
    none: '0',
    sm: '0.375rem',
    DEFAULT: '0.5rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    full: '9999px',
  },

  shadows: {
    none: 'none',
    sm: '0 1px 2px rgba(15, 23, 42, 0.04)',
    DEFAULT: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    md: '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
    lg: '0 12px 24px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.04)',
    xl: '0 24px 48px rgba(15, 23, 42, 0.10), 0 8px 16px rgba(15, 23, 42, 0.04)',
    focus: '0 0 0 3px rgba(234, 91, 38, 0.35)',
  },

  shell: {
    sidebar: '16rem',
    sidebarWide: '17rem',
    topbar: '4rem',
    maxContent: '80rem',
    maxNarrow: '40rem',
  },

  motion: {
    fast: '120ms',
    DEFAULT: '180ms',
    slow: '320ms',
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },

  z: {
    base: 0,
    raised: 10,
    dropdown: 1000,
    sticky: 1020,
    overlay: 1030,
    modal: 1040,
    toast: 1050,
    tooltip: 1060,
  },
} as const;

export type RidendineTokens = typeof ridendineTokens;
