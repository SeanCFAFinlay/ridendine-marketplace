'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard/finance', label: 'Overview' },
  { href: '/dashboard/finance/accounts/chefs', label: 'Chef accounts' },
  { href: '/dashboard/finance/accounts/drivers', label: 'Driver accounts' },
  { href: '/dashboard/finance/payouts', label: 'Payout runs' },
  { href: '/dashboard/finance/instant-payouts', label: 'Instant queue' },
  { href: '/dashboard/finance/reconciliation', label: 'Reconciliation' },
  { href: '/dashboard/finance/refunds', label: 'Refunds' },
] as const;

export function FinanceSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-gray-800 pb-4">
      {links.map(({ href, label }) => {
        const active = pathname === href || (href !== '/dashboard/finance' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              active ? 'bg-emerald-600/30 text-emerald-200' : 'bg-opsPanel text-gray-300 hover:bg-gray-700'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
