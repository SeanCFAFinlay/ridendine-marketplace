'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, type ReactNode } from 'react';
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
  UserCheck,
  Plus,
  X,
  Menu,
} from 'lucide-react';
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
      { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', Icon: UserCheck },
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
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = localStorage.getItem(key);
    return stored !== null ? stored === 'true' : defaultOpen;
  });

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
  const [isOpen, toggle] = useGroupOpen(group.id, group.defaultOpen);
  const { Icon } = group;

  const isGroupActive = group.items.some(
    (item) =>
      pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
  );

  if (collapsed) {
    return (
      <div className="relative group/group">
        <button
          onClick={toggle}
          className={`flex w-full items-center justify-center rounded-md p-2 transition-colors ${
            isGroupActive
              ? 'text-[#E85D26]'
              : 'text-gray-500 hover:text-gray-300'
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
        onClick={toggle}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
          isGroupActive ? 'text-gray-300' : 'text-gray-600 hover:text-gray-400'
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
                  className={`flex items-center gap-2.5 rounded-md py-2 pl-3 pr-3 text-sm transition-all ${
                    isActive
                      ? 'border-l-2 border-[#E85D26] bg-white/5 pl-[10px] font-medium text-white'
                      : 'border-l-2 border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
                  }`}
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
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-[#E85D26] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#d54d1a]"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Add</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-lg border border-gray-700 bg-opsPanel shadow-xl">
          {QUICK_CREATES.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
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
      <div className={`flex h-14 items-center border-b border-white/5 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <Image
          src="/logo-icon.png"
          alt="RideNDine"
          width={28}
          height={28}
          className="rounded-md flex-shrink-0"
        />
        {!collapsed && (
          <>
            <span className="text-base font-bold">
              <span className="text-[#1a9e8e]">RideN</span>
              <span className="text-[#E85D26]">Dine</span>
            </span>
            <span className="ml-auto rounded-full bg-[#E85D26]/20 px-2 py-0.5 text-[10px] font-semibold text-[#E85D26]">
              Ops
            </span>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
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
      <div className={`border-t border-white/5 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          {!collapsed && (
            <span className="text-[11px] text-gray-600">All systems operational</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-opsCanvas">
      {/* Desktop sidebar — icon-only below lg, full above lg */}
      <aside className="hidden w-12 flex-shrink-0 flex-col border-r border-white/5 bg-opsPanel md:flex lg:hidden">
        {sidebarContent(true)}
      </aside>
      <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-white/5 bg-opsPanel lg:flex">
        {sidebarContent(false)}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-white/5 bg-opsPanel">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <span className="text-sm font-semibold text-white">Navigation</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded p-1 text-gray-400 hover:text-white"
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
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-white/5 bg-opsCanvas px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded p-1.5 text-gray-500 hover:text-gray-300 md:hidden"
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
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="hidden text-xs font-medium text-green-400 sm:inline">Live</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
