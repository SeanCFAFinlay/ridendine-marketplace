// ==========================================
// RIDENDINE UI COMPONENTS
// ==========================================

// Utilities
export { cn } from './utils';
export { ridendineTokens } from './tokens';
export type { RidendineTokens } from './tokens';

// Brand assets
export { Logo } from './assets/logo';
export type { LogoProps } from './assets/logo';

// Components
export * from './components/button';
export * from './components/input';
export * from './components/card';
export * from './components/badge';
export * from './components/spinner';
export * from './components/avatar';
export * from './components/empty-state';
export * from './components/error-state';
export * from './components/modal';
export { PasswordStrength } from './components/password-strength';
export { AuthLayout } from './components/auth-layout';
export { AddressInput } from './components/address-input';
export { GlobalError } from './components/error-boundary';
export * from './components/platform';
export { KpiTile } from './components/kpi-tile';
export { StatusBadge } from './components/status-badge';
export type { StatusVariant } from './components/status-badge';
export { DataTable } from './components/data-table';
export type { ColumnDef, DataTableProps } from './components/data-table';
export { PageHeader } from './components/page-header';
export { ToastProvider, useToast } from './components/toast';
export type { ToastOptions, ToastVariant } from './components/toast';
export { LiveIndicator } from './components/live-indicator';
export type { LiveIndicatorProps, LiveIndicatorStatus } from './components/live-indicator';

// Layout shells — every app's chrome lives in one of these
export { MarketingShell } from './layouts/marketing-shell';
export type { MarketingShellProps, MarketingNavItem } from './layouts/marketing-shell';
export { AppShell } from './layouts/app-shell';
export type {
  AppShellProps,
  AppShellNavItem,
  AppShellNavGroup,
} from './layouts/app-shell';
export { MobileShell } from './layouts/mobile-shell';
export type { MobileShellProps, MobileTab } from './layouts/mobile-shell';
