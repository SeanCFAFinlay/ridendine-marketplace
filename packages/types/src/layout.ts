// ==========================================
// SHARED LAYOUT STRATEGY CONTRACT
// Defines the structural contract for app layouts.
// Does NOT enforce visual design — only structural consistency.
// Used to prepare for future app merge without changing current UI.
// ==========================================

/**
 * Navigation item definition shared across all app sidebars.
 */
export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  /** Sub-items for nested navigation */
  children?: NavItem[];
  /** Badge count (e.g., pending orders) */
  badge?: number;
  /** Required roles to see this item */
  requiredRoles?: string[];
  /** Whether this item is active based on current path */
  isActive?: (pathname: string) => boolean;
}

/**
 * Navigation section grouping.
 */
export interface NavSection {
  title?: string;
  items: NavItem[];
}

/**
 * Layout configuration contract.
 * Each app defines its layout using this structure.
 */
export interface LayoutConfig {
  /** Application identifier */
  appId: 'web' | 'chef-admin' | 'ops-admin' | 'driver-app';
  /** Display name shown in header/title */
  appName: string;
  /** Whether the app has a sidebar (admin apps do, web may not) */
  hasSidebar: boolean;
  /** Whether the app has a top header/navbar */
  hasHeader: boolean;
  /** Navigation sections for sidebar */
  navigation?: NavSection[];
  /** Role required to access this app */
  requiredRole?: string;
  /** Base color theme token */
  themeColor?: string;
}

/**
 * Breadcrumb item for page location tracking.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Page metadata contract for consistent page titles and descriptions.
 */
export interface PageMeta {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}
