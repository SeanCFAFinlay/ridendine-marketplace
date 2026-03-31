'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@ridendine/ui';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-4 py-12">
      <Card className="w-full max-w-md bg-white shadow-2xl" padding="lg">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-icon.png"
              alt="RideNDine"
              width={72}
              height={72}
              className="mx-auto h-auto w-16 rounded-2xl shadow-md"
              priority
            />
            <div className="mt-2 text-2xl font-bold tracking-tight">
              <span className="text-[#1a7a6e]">RideN</span>
              <span className="text-[#E85D26]">Dine</span>
            </div>
          </Link>
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#E85D26]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Chef Portal
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-8">
          {children}
        </div>
      </Card>
    </div>
  );
}
