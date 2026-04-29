'use client';

import * as React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** App variant controls the visual theme */
  variant?: 'customer' | 'chef' | 'ops' | 'driver';
  /** Optional badge text shown below the logo */
  badgeText?: string;
  /** Logo component — apps pass their own Next.js Image */
  logo?: React.ReactNode;
}

const variantStyles: Record<string, string> = {
  customer: 'bg-gradient-to-br from-[#fff8f4] via-white to-[#f0faf9]',
  chef: 'bg-gradient-to-br from-[#1a1a2e] to-[#16213e]',
  ops: 'bg-gradient-to-br from-[#0f172a] to-[#1e293b]',
  driver: 'bg-gradient-to-br from-[#1a1a2e] to-[#0f4c3a]',
};

const cardStyles: Record<string, string> = {
  customer: 'shadow-lg',
  chef: 'bg-white shadow-2xl',
  ops: 'bg-white shadow-2xl',
  driver: 'bg-white shadow-2xl',
};

export function AuthLayout({
  children,
  title,
  subtitle,
  variant = 'customer',
  badgeText,
  logo,
}: AuthLayoutProps) {
  const bgClass = variantStyles[variant] ?? variantStyles.customer;
  const cardClass = cardStyles[variant] ?? cardStyles.customer;

  return (
    <div className={`flex min-h-screen items-center justify-center ${bgClass} px-4 py-12`}>
      <div className={`w-full max-w-md rounded-2xl ${cardClass} p-8`}>
        <div className="text-center">
          {logo && <div className="inline-block">{logo}</div>}
          <div className="mt-2 text-2xl font-bold tracking-tight">
            <span className="text-[#1a7a6e]">RideN</span>
            <span className="text-[#E85D26]">Dine</span>
          </div>
          {badgeText && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#E85D26]">
              {badgeText}
            </div>
          )}
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
