import type { Config } from 'tailwindcss';
import { ridendineTokens as t } from '@ridendine/ui/tokens';

// Shared Tailwind preset. Every app extends this — apps must NOT redefine these tokens.
// Tokens live in @ridendine/ui/tokens (single source of truth).
//
// Phase 1 of the design-system migration: new brand tokens are added below, and
// legacy palette colors (brand-50..950, ops*, success-50/500/700, etc.) are
// preserved as deprecation shims so existing usages continue to build. Phase
// 2+ migrations will progressively eliminate the shims app-by-app.

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── New canonical brand tokens ─────────────────────────────
        primary: t.colors.primary,
        primaryHover: t.colors.primaryHover,
        primaryActive: t.colors.primaryActive,
        primarySoft: t.colors.primarySoft,
        primaryFg: t.colors.primaryFg,

        accent: t.colors.accent,
        accentSoft: t.colors.accentSoft,

        background: t.colors.background,
        surface: t.colors.surface,
        surfaceMuted: t.colors.surfaceMuted,
        surfaceSubtle: t.colors.surfaceSubtle,

        border: t.colors.border,
        borderStrong: t.colors.borderStrong,
        divider: t.colors.divider,

        text: t.colors.text,
        textMuted: t.colors.textMuted,
        textSubtle: t.colors.textSubtle,

        // Semantic — DEFAULT is the new canonical value; numeric keys are legacy shims.
        success: {
          DEFAULT: t.colors.success,
          soft: t.colors.successSoft,
          50: '#f0fdf4', // legacy
          500: '#22c55e', // legacy
          700: '#15803d', // legacy
        },
        successSoft: t.colors.successSoft,
        danger: {
          DEFAULT: t.colors.danger,
          soft: t.colors.dangerSoft,
        },
        dangerSoft: t.colors.dangerSoft,
        warning: {
          DEFAULT: t.colors.warning,
          soft: t.colors.warningSoft,
          50: '#fffbeb', // legacy
          500: '#f59e0b', // legacy
          700: '#b45309', // legacy
        },
        warningSoft: t.colors.warningSoft,
        info: {
          DEFAULT: t.colors.info,
          soft: t.colors.infoSoft,
        },
        infoSoft: t.colors.infoSoft,

        focusRing: t.colors.focusRing,

        // ── Legacy palette shims — DEPRECATED ──────────────────────
        // Kept so the ~2.5k existing hardcoded usages keep building during the
        // Phase 2–7 per-app migrations. Remove once each app is converted.
        brand: {
          50: '#fef7ee',
          100: '#fdedd6',
          200: '#fad7ac',
          300: '#f6ba77',
          400: '#f19340',
          500: '#ed751b',
          600: '#de5b11',
          700: '#b84410',
          800: '#933615',
          900: '#772f14',
          950: '#401508',
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        opsCanvas: '#0b1220',
        opsPanel: '#111827',
        opsPanelElevated: '#1f2937',
        opsSubtle: '#1f2937',
        opsDefault: '#374151',
        opsPrimary: '#f9fafb',
        opsSecondary: '#cbd5e1',
        opsMuted: '#64748b',
      },

      // The first entry is the CSS variable injected by next/font in each app's
      // root layout. Subsequent entries are the same fallback chain encoded in
      // the tokens — kept inline here so the preset stays self-contained at
      // Tailwind build time (no need to parse the comma-joined token string).
      fontFamily: {
        sans: [
          'var(--font-sans)',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          'var(--font-display)',
          'Plus Jakarta Sans',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },

      fontSize: t.fontSize,
      fontWeight: t.fontWeight,
      lineHeight: t.lineHeight,
      borderRadius: t.radius,
      boxShadow: t.shadows,
      spacing: t.spacing,
      zIndex: {
        base: String(t.z.base),
        raised: String(t.z.raised),
        dropdown: String(t.z.dropdown),
        sticky: String(t.z.sticky),
        overlay: String(t.z.overlay),
        modal: String(t.z.modal),
        toast: String(t.z.toast),
        tooltip: String(t.z.tooltip),
      },

      maxWidth: {
        content: t.shell.maxContent,
        narrow: t.shell.maxNarrow,
      },

      transitionDuration: {
        fast: t.motion.fast,
        DEFAULT: t.motion.DEFAULT,
        slow: t.motion.slow,
      },
      transitionTimingFunction: {
        brand: t.motion.easing,
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'badge-bounce': 'badgeBounce 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s ease-out both',
        'fade-in-scroll': 'fadeInScroll 0.5s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        badgeBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInScroll: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
