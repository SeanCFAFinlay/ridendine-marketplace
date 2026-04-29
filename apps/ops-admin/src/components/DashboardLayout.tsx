'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { OpsAlerts } from './ops-alerts';
import { GlobalSearch } from './global-search';

interface NavItem {
  href: string;
  label: string;
  iconPath: string;
  section?: string;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    iconPath: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    section: 'Main',
  },
  {
    href: '/dashboard/map',
    label: 'Live Map',
    iconPath: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  },
  {
    href: '/dashboard/orders',
    label: 'Orders',
    iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    href: '/dashboard/deliveries',
    label: 'Deliveries',
    iconPath: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
    section: 'Operations',
  },
  {
    href: '/dashboard/chefs',
    label: 'Chefs',
    iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    href: '/dashboard/chefs/approvals',
    label: 'Chef Approvals',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    href: '/dashboard/drivers',
    label: 'Drivers',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    href: '/dashboard/customers',
    label: 'Customers',
    iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    section: 'Business',
  },
  {
    href: '/dashboard/finance',
    label: 'Finance',
    iconPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    href: '/dashboard/promos',
    label: 'Promos',
    iconPath: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    href: '/dashboard/support',
    label: 'Support',
    iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    section: 'System',
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  // Group nav items by section
  const sections: Record<string, NavItem[]> = {};
  let currentSection = 'Main';
  for (const item of navItems) {
    if (item.section) currentSection = item.section;
    if (!sections[currentSection]) sections[currentSection] = [];
    sections[currentSection]!.push(item);
  }

  return (
    <div className="flex min-h-screen bg-[#0f1923]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/5 bg-[#0d1520] lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/5 px-5">
          <Image
            src="/logo-icon.png"
            alt="RideNDine"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-lg font-bold">
            <span className="text-[#1a9e8e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </span>
          <span className="ml-auto rounded-full bg-[#E85D26]/20 px-2 py-0.5 text-xs font-medium text-[#E85D26]">
            Ops
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {Object.entries(sections).map(([section, items]) => (
            <div key={section} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {section}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-[#E85D26] text-white'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={item.iconPath}
                          />
                        </svg>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-gray-500">All systems operational</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex h-16 items-center justify-between border-b border-white/5 bg-[#0d1520] px-6">
          <div className="text-sm font-medium text-gray-400">Operations Command Centre</div>
          <div className="flex items-center gap-4">
            <GlobalSearch />
            <OpsAlerts />
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-sm text-green-400 font-medium">Live</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
