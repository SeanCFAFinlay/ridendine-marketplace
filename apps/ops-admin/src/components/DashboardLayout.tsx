'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/map', label: 'Live Map', icon: '🗺️' },
  { href: '/dashboard/orders', label: 'Orders', icon: '📦' },
  { href: '/dashboard/deliveries', label: 'Deliveries', icon: '🚗' },
  { href: '/dashboard/chefs', label: 'Chefs', icon: '👨‍🍳' },
  { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', icon: '✅' },
  { href: '/dashboard/drivers', label: 'Drivers', icon: '🚚' },
  { href: '/dashboard/customers', label: 'Customers', icon: '👥' },
  { href: '/dashboard/support', label: 'Support', icon: '💬' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-[#1a1a2e]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-[#16213e]">
        <div className="flex h-16 items-center border-b border-gray-800 px-6">
          <h1 className="text-xl font-bold text-[#E85D26]">Ridendine Ops</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E85D26] text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        <div className="border-b border-gray-800 bg-[#16213e]">
          <div className="flex h-16 items-center justify-between px-8">
            <div className="text-sm text-gray-400">Operations Dashboard</div>
            <div className="flex items-center gap-4">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-400">All Systems Operational</span>
            </div>
          </div>
        </div>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
