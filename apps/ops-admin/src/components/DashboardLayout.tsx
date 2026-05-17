'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuthContext } from '@ridendine/auth';
import {
  Activity,
  Package,
  Users,
  DollarSign,
  Settings2,
  LayoutDashboard,
  Zap,
  Map,
  ClipboardList,
  Truck,
  RefreshCcw,
  ChevronDown,
  CreditCard,
  Wallet,
  Banknote,
  Tag,
  Megaphone,
  Bot,
  BarChart3,
  LineChart,
  Wrench,
  Puzzle,
  UserCog,
  HeadphonesIcon,
  HeartPulse,
  UserCheck,
  Plus,
  X,
  Menu,
  LogOut,
} from 'lucide-react';
import { Logo } from '@ridendine/ui';
import { OpsAlerts } from './ops-alerts';
import { GlobalSearch } from './global-search';

interface NavItem {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'operate',
    label: 'Operate',
    Icon: Activity,
    defaultOpen: true,
    items: [
      { href: '/dashboard', label: 'Live Board', Icon: LayoutDashboard },
      { href: '/dashboard/dispatch', label: 'Dispatch', Icon: Zap },
      { href: '/dashboard/map', label: 'Live Map', Icon: Map },
      { href: '/dashboard/activity', label: 'Activity Log', Icon: ClipboardList },
      { href: '/dashboard/health', label: 'Health', Icon: HeartPulse },
    ],
  },
  {
    id: 'orders',
    label: 'Orders & Deliveries',
    Icon: Package,
    items: [
      { href: '/dashboard/orders', label: 'All Orders', Icon: Package },
      { href: '/dashboard/deliveries', label: 'Deliveries', Icon: Truck },
      { href: '/dashboard/finance/refunds', label: 'Refunds & Disputes', Icon: RefreshCcw },
    ],
  },
  {
    id: 'people',
    label: 'People',
    Icon: Users,
    items: [
      { href: '/dashboard/chefs', label: 'Chefs', Icon: UserCog },
      { href: '/dashboard/chefs/approvals', label: 'Chef Onboarding', Icon: UserCheck },
      { href: '/dashboard/drivers', label: 'Drivers', Icon: Truck },
      { href: '/dashboard/customers', label: 'Customers', Icon: Users },
    ],
  },
  {
    id: 'money',
    label: 'Money',
    Icon: DollarSign,
    items: [
      { href: '/dashboard/finance', label: 'Finance Overview', Icon: DollarSign },
      { href: '/dashboard/finance/reconciliation', label: 'Reconciliation', Icon: CreditCard },
      { href: '/dashboard/finance/payouts', label: 'Payouts', Icon: Wallet },
      { href: '/dashboard/finance/instant-payouts', label: 'Instant Payouts', Icon: Banknote },
      { href: '/dashboard/promos', label: 'Promos', Icon: Tag },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    Icon: Settings2,
    items: [
      { href: '/dashboard/announcements', label: 'Announcements', Icon: Megaphone },
      { href: '/dashboard/automation', label: 'Automation Rules', Icon: Bot },
      { href: '/dashboard/reports', label: 'Reports', Icon: BarChart3 },
      { href: '/dashboard/analytics', label: 'Analytics', Icon: LineChart },
      { href: '/dashboard/settings', label: 'Settings', Icon: Wrench },
      { href: '/dashboard/integrations', label: 'Integrations', Icon: Puzzle },
      { href: '/dashboard/team', label: 'Team', Icon: UserCog },
      { href: '/dashboard/support', label: 'Support', Icon: HeadphonesIcon },
    ],
  },
];

const QUICK_CREATES = [
  { href: '/dashboard/chefs', label: 'Add Chef' },
  { href: '/dashboard/drivers', label: 'Add Driver' },
  { href: '/dashboard/promos', label: 'Add Promo' },
  { href: '/dashboard/announcements', label: 'Send Announcement' },
];

function useGroupOpen(groupId: string, defaultOpen = false) {
  const key = `opsadmin.nav.${groupId}`;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const stored = localStorage.getItem(key);
    if (stored !== null && !defaultOpen) {
      setIsOpen(stored === 'true');
    }
  }, [defaultOpen, key]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      localStorage.setItem(key, String(next));
      return next;
    });
  }, [key]);

  return [isOpen, toggle] as const;
}

function NavGroupItem({ group, pathname, collapsed }: {
  group: NavGroup;
  pathname: string;
  collapsed: boolean;
}) {
  const { Icon } = group;

  const isGroupActive = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  );
  const [isOpen, toggle] = useGroupOpen(group.id, Boolean(group.defaultOpen || isGroupActive));

  if (collapsed) {
    return (
      <div className="relative group/group">
        <button
          type="button"
          onClick={toggle}
          className={`flex w-full items-center justify-center rounded-md p-2 transition-colors ${
            isGroupActive
              ? 'text-primary'
              : 'text-textMuted hover:text-text'
          }`}
          aria-label={group.label}
          title={group.label}
        >
          <Icon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
          isGroupActive ? 'text-text' : 'text-textSubtle hover:text-textMuted'
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" />
          {group.label}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <ul className="mt-0.5 space-y-0.5 pb-1">
          {group.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 rounded-md py-2 pl-3 pr-3 text-sm transition-colors ${
                    isActive
                      ? 'border-l-2 border-primary bg-primarySoft pl-[10px] font-medium text-primary'
                      : 'border-l-2 border-transparent text-textMuted hover:bg-surfaceMuted hover:text-text'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function QuickCreateMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primaryFg transition-colors hover:bg-primaryHover focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Add</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-1.5 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          {QUICK_CREATES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuthContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push('/auth/login');
  };

  const initials = (user?.email?.slice(0, 2) || 'OP').toUpperCase();
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Ops';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
        aria-label="Open user menu"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primaryFg">
          {initials}
        </span>
        <span className="hidden max-w-[160px] truncate sm:inline">{displayName}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-1.5 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl">
          <div className="border-b border-divider px-4 py-3">
            <p className="truncate text-sm font-medium text-text">{displayName}</p>
            <p className="truncate text-xs text-textMuted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-dangerSoft"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const sidebarContent = (collapsed: boolean) => (
    <>
      {/* Logo */}
      <div className={`flex h-14 items-center border-b border-border ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:shadow-focus"
          aria-label="Ops admin — home"
        >
          <Logo height={26} variant={collapsed ? 'icon' : 'wordmark'} />
        </Link>
        {!collapsed && (
          <span className="ml-auto rounded-full bg-primarySoft px-2 py-0.5 text-[10px] font-semibold text-primary">
            Ops
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2" aria-label="Primary">
        {NAV_GROUPS.map((group) => (
          <NavGroupItem
            key={group.id}
            group={group}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Status footer */}
      <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          {!collapsed && (
            <span className="text-[11px] text-textMuted">All systems operational</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — icon-only below lg, full above lg */}
      <aside className="hidden w-12 flex-shrink-0 flex-col border-r border-border bg-surface md:flex lg:hidden">
        {sidebarContent(true)}
      </aside>
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-border bg-surface lg:flex">
        {sidebarContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-modal md:hidden">
          <div
            className="absolute inset-0 bg-text/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-text">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {NAV_GROUPS.map((group) => (
                <NavGroupItem
                  key={group.id}
                  group={group}
                  pathname={pathname}
                  collapsed={false}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-sticky flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 text-textMuted transition-colors hover:bg-surfaceMuted hover:text-text focus-visible:outline-none focus-visible:shadow-focus md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <QuickCreateMenu />
            <OpsAlerts />
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="hidden text-xs font-medium text-success sm:inline">Live</span>
            </div>
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
