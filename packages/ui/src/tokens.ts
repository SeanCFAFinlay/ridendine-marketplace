export const ridendineTokens = {
  colors: {
    background: '#080b10',
    surface: '#111827',
    surfaceRaised: '#172033',
    border: '#263244',
    primary: '#f59e0b',
    primarySoft: '#451f06',
    text: '#f8fafc',
    muted: '#94a3b8',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    info: '#38bdf8',
  },
  spacing: {
    pageX: 'clamp(1rem, 3vw, 2rem)',
    pageY: 'clamp(1rem, 2vw, 1.5rem)',
    section: '1.5rem',
  },
  radius: {
    card: '1rem',
    control: '0.75rem',
    pill: '999px',
  },
  shadows: {
    card: '0 18px 50px rgb(0 0 0 / 0.28)',
    glow: '0 0 0 1px rgb(245 158 11 / 0.18), 0 18px 60px rgb(245 158 11 / 0.12)',
  },
  typography: {
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  status: {
    live: { label: 'Live', color: '#22c55e' },
    fresh: { label: 'Fresh', color: '#38bdf8' },
    stale: { label: 'Stale', color: '#f59e0b' },
    offline: { label: 'Offline', color: '#64748b' },
    error: { label: 'Error', color: '#ef4444' },
  },
  shell: {
    sidebar: '17rem',
    topbar: '4.5rem',
    maxContent: '90rem',
  },
} as const;

export type RidendineTokens = typeof ridendineTokens;
